import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const findExistingFile = (fileName: string): string | null => {
  const candidateDirs = [
    path.resolve(__dirname, '../../../'),
    path.resolve(__dirname, '../../'),
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), '../')
  ];
  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, fileName);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
};

/**
 * Public direct download for Android APK
 */
router.get('/apk', (_req: Request, res: Response) => {
  const filePath = findExistingFile('ArthoVista-CRM-Sync-v1.0.1-FIXED.apk');
  if (!filePath) {
    return res.status(404).send('Android APK file not found on server.');
  }
  return res.download(filePath, 'ArthoVista-CRM-Sync-v1.0.1-FIXED.apk');
});

/**
 * Public direct download for iOS IPA
 */
router.get('/ipa', (_req: Request, res: Response) => {
  const filePath = findExistingFile('ArthoVistaCRMSync.ipa');
  if (!filePath) {
    return res.status(404).send('iOS IPA file not found on server.');
  }
  return res.download(filePath, 'ArthoVistaCRMSync.ipa');
});

/**
 * Public direct download for iOS Full Xcode Project Zip
 */
router.get('/ios-project', (_req: Request, res: Response) => {
  const filePath = findExistingFile('ArthoVistaCRMSync-iOS-Project.zip');
  if (!filePath) {
    return res.status(404).send('iOS Project package not found on server.');
  }
  return res.download(filePath, 'ArthoVistaCRMSync-iOS-Project.zip');
});

export default router;
