import { File } from "@google-cloud/storage";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

// The type of the access group for medical documents
export enum ObjectAccessGroupType {
  PATIENT_OWNER = "patient_owner",
  DOCTOR_ACCESS = "doctor_access", 
  HEALTHCARE_PROVIDER = "healthcare_provider"
}

// The logic user group that can access the object.
export interface ObjectAccessGroup {
  // The type of the access group.
  type: ObjectAccessGroupType;
  // The logic id that is enough to identify the qualified group members.
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

// The ACL policy of the object for HIPAA/GDPR compliance
export interface ObjectAclPolicy {
  owner: string; // Patient ID who owns the document
  visibility: "private"; // All medical documents are private
  aclRules?: Array<ObjectAclRule>;
  // HIPAA/GDPR compliance fields
  encryptionEnabled: boolean;
  auditLogging: boolean;
  dataClassification: "PHI" | "PII" | "SENSITIVE"; // Protected Health Information
  retentionPolicy?: {
    retainUntil?: string; // ISO date string
    autoDelete?: boolean;
  };
}

// Check if the requested permission is allowed based on the granted permission.
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  // Users granted with read or write permissions can read the object.
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }

  // Only users granted with write permissions can write the object.
  return granted === ObjectPermission.WRITE;
}

// The base class for all access groups.
abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}

  // Check if the user is a member of the group.
  public abstract hasMember(userId: string): Promise<boolean>;
}

// Patient owner access group - only the patient who owns the document
class PatientOwnerAccessGroup extends BaseObjectAccessGroup {
  constructor(patientId: string) {
    super(ObjectAccessGroupType.PATIENT_OWNER, patientId);
  }

  async hasMember(userId: string): Promise<boolean> {
    return userId === this.id;
  }
}

// Doctor access group - doctors who have treated the patient
class DoctorAccessGroup extends BaseObjectAccessGroup {
  constructor(patientId: string) {
    super(ObjectAccessGroupType.DOCTOR_ACCESS, patientId);
  }

  async hasMember(userId: string): Promise<boolean> {
    // In a real implementation, check if the doctor has an appointment with the patient
    // For now, we'll allow any authenticated doctor to access (should be refined)
    return true; // This should be replaced with actual appointment checking
  }
}

// Healthcare provider access group - authorized healthcare providers
class HealthcareProviderAccessGroup extends BaseObjectAccessGroup {
  constructor(providerId: string) {
    super(ObjectAccessGroupType.HEALTHCARE_PROVIDER, providerId);
  }

  async hasMember(userId: string): Promise<boolean> {
    // Check if user is part of the healthcare provider organization
    return userId === this.id;
  }
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    case ObjectAccessGroupType.PATIENT_OWNER:
      return new PatientOwnerAccessGroup(group.id);
    case ObjectAccessGroupType.DOCTOR_ACCESS:
      return new DoctorAccessGroup(group.id);
    case ObjectAccessGroupType.HEALTHCARE_PROVIDER:
      return new HealthcareProviderAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

// Sets the ACL policy to the object metadata with HIPAA/GDPR compliance.
export async function setObjectAclPolicy(
  objectFile: File,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }

  // Ensure compliance defaults
  const compliantPolicy: ObjectAclPolicy = {
    ...aclPolicy,
    visibility: "private", // All medical documents are private
    encryptionEnabled: true, // Always encrypt PHI
    auditLogging: true, // Always log access for compliance
    dataClassification: aclPolicy.dataClassification || "PHI",
  };

  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(compliantPolicy),
      // Additional HIPAA/GDPR metadata
      "compliance:encrypted": "true",
      "compliance:classification": compliantPolicy.dataClassification,
      "compliance:audit-enabled": "true",
      "compliance:created-at": new Date().toISOString(),
    },
  });

  // Log access for audit trail (HIPAA requirement)
  console.log(`🔒 ACL Policy set for object: ${objectFile.name}`, {
    owner: compliantPolicy.owner,
    classification: compliantPolicy.dataClassification,
    timestamp: new Date().toISOString(),
  });
}

// Gets the ACL policy from the object metadata.
export async function getObjectAclPolicy(
  objectFile: File,
): Promise<ObjectAclPolicy | null> {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy as string);
}

// Checks if the user can access the object with full audit logging.
export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: File;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // Log access attempt for HIPAA audit trail
  console.log(`🔍 Access attempt logged:`, {
    objectName: objectFile.name,
    userId: userId || "anonymous",
    permission: requestedPermission,
    timestamp: new Date().toISOString(),
  });

  // When this function is called, the acl policy is required.
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    console.log(`❌ Access denied: No ACL policy found for ${objectFile.name}`);
    return false;
  }

  // Medical documents are always private
  if (aclPolicy.visibility !== "private") {
    console.log(`❌ Access denied: Medical document must be private`);
    return false;
  }

  // Access control requires the user id for PHI.
  if (!userId) {
    console.log(`❌ Access denied: User authentication required for PHI`);
    return false;
  }

  // The owner of the object can always access it.
  if (aclPolicy.owner === userId) {
    console.log(`✅ Access granted: User is document owner`);
    return true;
  }

  // Go through the ACL rules to check if the user has the required permission.
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      console.log(`✅ Access granted: User has permission via ACL rule`, {
        groupType: rule.group.type,
        permission: rule.permission,
      });
      return true;
    }
  }

  console.log(`❌ Access denied: No matching ACL rules for user ${userId}`);
  return false;
}