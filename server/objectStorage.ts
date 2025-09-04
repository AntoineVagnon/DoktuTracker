import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      // Full path format: /<bucket_name>/<object_name>
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600, fileName?: string) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      console.log('📋 DOWNLOAD METADATA:', {
        name: metadata.name,
        contentType: metadata.contentType,
        size: metadata.size,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        md5Hash: metadata.md5Hash,
        crc32c: metadata.crc32c
      });
      
      // Get the ACL policy for the object.
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      
      // Determine the content type - prefer stored metadata, fallback to file extension
      let contentType = metadata.contentType || "application/octet-stream";
      
      // If no proper content type and we have a filename, try to determine from extension
      if (contentType === "application/octet-stream" && fileName) {
        const ext = fileName.toLowerCase().split('.').pop();
        switch (ext) {
          case 'pdf': contentType = 'application/pdf'; break;
          case 'jpg':
          case 'jpeg': contentType = 'image/jpeg'; break;
          case 'png': contentType = 'image/png'; break;
          case 'gif': contentType = 'image/gif'; break;
          case 'txt': contentType = 'text/plain'; break;
          case 'doc': contentType = 'application/msword'; break;
          case 'docx': contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
          case 'xls': contentType = 'application/vnd.ms-excel'; break;
          case 'xlsx': contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; break;
        }
      }

      // Set appropriate headers including Content-Disposition for proper downloads
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Content-Length": metadata.size?.toString() || "0",
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff"
      };

      // Add Content-Disposition header with filename if provided
      if (fileName) {
        // Sanitize filename for HTTP header and encode properly
        const sanitizedFilename = fileName.replace(/[^\w\-_\. ()]/g, '');
        headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(sanitizedFilename)}`;
      }

      console.log('📤 DOWNLOAD HEADERS:', headers);
      res.set(headers);

      // Stream the file to the response
      const stream = file.createReadStream();

      let bytesStreamed = 0;
      let firstChunk = true;
      let totalBuffer = Buffer.alloc(0);
      
      stream.on("data", (chunk) => {
        bytesStreamed += chunk.length;
        
        // Capture first chunk for analysis
        if (firstChunk) {
          console.log('🔍 DOWNLOAD: First chunk analysis:', {
            chunkSize: chunk.length,
            firstBytes: chunk.slice(0, 16).toString('hex'),
            isPNG: chunk.slice(0, 8).toString('hex') === '89504e470d0a1a0a',
            fileSize: metadata.size
          });
          firstChunk = false;
        }
        
        // Capture data for end analysis (limited to prevent memory issues)
        if (totalBuffer.length < 100000) { // Only capture first 100KB for analysis
          totalBuffer = Buffer.concat([totalBuffer, chunk]);
        }
      });
      
      stream.on("error", (err) => {
        console.error("💥 Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.on("end", () => {
        console.log(`✅ Download completed: ${bytesStreamed} bytes streamed`);
        
        // Analyze what came out of cloud storage
        if (totalBuffer.length > 0) {
          const lastBytes = totalBuffer.length > 16 ? totalBuffer.slice(-16).toString('hex') : totalBuffer.toString('hex');
          console.log('🔍 DOWNLOAD: Final analysis:', {
            totalBytesReceived: bytesStreamed,
            expectedSize: metadata.size,
            bufferCaptured: totalBuffer.length,
            lastBytes: lastBytes,
            hasValidPNGEnd: lastBytes.includes('49454e44ae426082'),
            sizeMismatch: metadata.size && bytesStreamed !== metadata.size
          });
        }
      });

      // Verify file exists and is readable before streaming
      const [exists] = await file.exists();
      if (!exists) {
        throw new ObjectNotFoundError();
      }

      console.log(`🚀 Starting download stream for: ${fileName || 'unknown'}`);
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
  
    // Extract the path from the URL by removing query parameters and domain
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
  
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
  
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
  
    // Extract the entity ID from the path
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}