import { createCompletion, loadModel } from 'gpt4all';
import path from 'path';

const MODEL_PATH = path.join('.', 'alpaca-mini-gguf-q4_0.gguf');

async function generateQuote() {
  try {
    const model = await loadModel(MODEL_PATH, { verbose: true });

    const prompt = "Write a short, uplifting motivational quote for social media.";
    const response = await createCompletion(model, prompt);

    console.log("Generated Quote:\n", response.choices[0].message);

    model.dispose();
  } catch (error) {
    console.error("Error generating quote:", error);
  }
}

generateQuote();
