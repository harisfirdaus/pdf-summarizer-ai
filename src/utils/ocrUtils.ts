
import { createWorker } from 'tesseract.js';

export const performOCR = async (canvas: HTMLCanvasElement) => {
  const worker = await createWorker();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(canvas);
  await worker.terminate();
  return text;
};

