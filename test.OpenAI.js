// testOpenAI.js

import { Configuration, OpenAIApi } from 'openai';
import 'dotenv/config';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const runTest = async () => {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-4", // Use "gpt-4o" if it's a valid model for your account
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Write a haiku about programming." }
      ],
      temperature: 0.3,
      max_tokens: 100
    });
    console.log(completion.data.choices[0].message.content);
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
};

runTest();
