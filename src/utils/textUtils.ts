
export const formatSummary = (text: string) => {
  return text
    .replace(/\*\*Paragraf \d+:\*\*/g, '')
    .replace(/Paragraf \d+:/g, '')
    .split('\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .join('\n\n');
};

