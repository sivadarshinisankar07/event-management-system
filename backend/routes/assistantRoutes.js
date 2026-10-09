import express from 'express';
import { chatAssistant } from '../controllers/assistantController.js';

const router = express.Router();

// Assistant chat endpoint (available to public and authenticated users)
router.post('/chat', chatAssistant);

export default router;
