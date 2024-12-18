import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import OpenAI from 'openai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Put all instructions into a variable
const instructions = `
You are a highly skilled U.S. tax expert specializing in detailed aggressive financial strategies.
You have been provided with comprehensive financial data about a client.
Your objective is to create actionable, precise financial plans tailored specifically to this data.
These plans must leverage all applicable U.S. tax laws and strategies, ensuring both compliance and maximum tax savings.
You think through complex opportunities and deliver articulate solutions with detail of a mathematician.

Your response MUST:
1. Explicitly reference the exact financial details provided in the uploaded file(s).
2. Present strategies step-by-step with detailed actions, outcomes, and tax savings breakdowns.
3. Include tables or bullet points for clarity.
4. Assume an advanced audience with tax and financial expertise.
5. Tie every recommendation back to the provided data and justify your suggestions.
6. Base calculations on realistic tax brackets or provided values.
7. Provide both short-term and long-term benefits of the strategies proposed.
8. Use advanced tax strategies where applicable (e.g., cost segregation, QBI deductions, opportunity zones, etc.).

Your tone should be authoritative, precise, and highly detailed, as if addressing tax professionals.
Always provide a structured response and include necessary clarifications.

*use graphs where necessary*

Part 1: You are to take this couple and give me the best ideas for them to lower their taxable income. All options within the code are on the table. The possibility of new businesses, buying/selling assets, etc are on the table. I will give the amount liquid to spend for each situation. Your job is to figure out how do I try my best to zero out their taxable income to a reasonable degree. Give unique options that only an aggressive brilliant within the code accountant would give. At the bottom of the response give a spread sheet for total savings and details. Give the tax savings from proposed changes for their given tax bracket. If no tax bracket is given, utilize only federal and state tax bracket based on information given. The following format with a detailed graph at the end is what I am looking for, Follow this structure for response and add in more info or ideas where necessary:
`;

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (fileExt !== '.txt') {
      return cb(new Error('Only .txt files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 1 * 1024 * 1024 }
});

app.post('/process', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded. Please upload at least one .txt file." });
    }

    let fileContents = '';
    for (const file of req.files) {
      const fullPath = path.join(__dirname, file.path);
      try {
        const data = await fs.readFile(fullPath, 'utf-8');
        fileContents += `\n\n--- File: ${file.originalname} ---\n${data}\n`;
      } catch (readError) {
        console.error(`Error reading file ${file.originalname}:`, readError);
        return res.status(500).json({ error: `Error reading file ${file.originalname}.` });
      } finally {
        try {
          await fs.unlink(fullPath);
        } catch (deleteError) {
          console.error(`Error deleting file ${file.originalname}:`, deleteError);
        }
      }
    }

    // Combine instructions and fileContents into a single user message
    const userMessage = `${instructions}\n\nBelow is the detailed financial information of the client. This information must be referenced:\n${fileContents}`;

    const completion = await openai.chat.completions.create({
      model: "o1-preview-2024-09-12",
      messages: [
        { role: "user", content: userMessage }
      ],
      temperature: 1,
      max_completion_tokens: 7431
    });

    if (completion.choices && completion.choices.length > 0) {
      res.json({ result: completion.choices[0].message.content });
    } else {
      res.status(500).json({ error: "No response from AI." });
    }

  } catch (error) {
    console.error("Error in /process endpoint:", error);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

app.post('/chat', async (req, res) => {
  let { message, chatHistory } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided." });
  }

  const maxChatHistory = 5;
  if (chatHistory && chatHistory.length > maxChatHistory) {
    chatHistory = chatHistory.slice(-maxChatHistory);
  }

  const messages = [
    ...(chatHistory || []),
    { role: 'user', content: message }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "o1-preview-2024-09-12",
      messages: messages,
      temperature: 1,
      max_completion_tokens: 7431
    });

    if (completion.choices && completion.choices.length > 0) {
      res.json({ response: completion.choices[0].message.content });
    } else {
      res.status(500).json({ error: "No response from AI." });
    }

  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
