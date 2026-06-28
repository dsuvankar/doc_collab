import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { 
  createDoc, 
  getVersions, 
  saveDocVersion, 
  restoreVersion,
  deleteDocVersion
} from "../controllers/docs.js";

const router = Router();

router.use(requireAuth);

router.post("/create_document", createDoc);
router.get("/document_versions/:id", getVersions);
router.post("/save_version", saveDocVersion);
router.post("/restore_version", restoreVersion);
router.delete("/delete_version", deleteDocVersion);

export default router;
