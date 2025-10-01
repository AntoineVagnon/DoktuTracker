// Version simplifiée pour production sans Vite
import path from "path";
import { type Express } from "express";

export function serveStatic(app: Express) {
  console.log('Static file serving skipped in Railway production deployment');
  // En production Railway, nous servons seulement l'API
  // Le frontend est déployé séparément sur Vercel
  
  // Ajout d'un endpoint pour confirmer que le serveur API fonctionne
  app.get('/', (req, res) => {
    res.json({ 
      message: 'DoktuTracker API Server', 
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    });
  });
}

export function log(message: string) {
  console.log(message);
}