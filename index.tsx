
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  SparklesIcon, 
  TrashIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon, 
  CheckIcon, 
  UserCircleIcon
} from '@heroicons/react/24/outline';

// --- Types ---
interface ReviewData {
  originalReview: string;
  authorName: string;
  reply: string;
}

interface ProcessingResult {
  reviews: ReviewData[];
}

// --- AI Service ---
const SYSTEM_PROMPT = `
Ты помощник по ответам на отзывы онлайн-школы "Учи.Дома".
Извлеки из предоставленного текста ВСЕ отзывы (даже из HTML-разметки).

Для каждого отзыва напиши вежливый тёплый ответ на русском строго по правилам:

• СТРУКТУРА ОТВЕТА (СОБЛЮДАЙ СТРОГО):
  1. Приветствие по имени (если имя видно — используй, иначе «Здравствуйте»)
  2. Благодарность — строго одна из этих фраз с синим сердечком в конце:
     - Благодарим вас за отзыв и высокую оценку нашей школы 💙
     - Благодарим вас за отзыв и приятные слова о нашей школе 💙
     - Благодарим вас за отзыв и доверие к нашей школе 💙
  3. ПУСТАЯ СТРОКА
  4. 1–3 предложения с отсылкой к сути отзыва (поблагодарить за конкретику / извиниться если жалоба / отметить важное)
  5. ПУСТАЯ СТРОКА
  6. Пожелание: «Желаем успехов в обучении!», «Успехов и новых достижений!» и т.п.

• ЗАПРЕТЫ:
  - НИКОГДА не используй слова: сын, дочь, ребёнок, мама, папа, ваш сын, ваш ученик, ваша ученица, малыш и подобные.
  - Используй вместо них: ученик, ученица, он, она, вы (по контексту).

Верни результат в формате JSON, где поле 'reply' содержит текст с переносами строк \\n.
`;

async function processReviews(text: string): Promise<ProcessingResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'AIzaSyCB61T5ZwGfeHUqB-2KMJbIEajib6pOhpM' });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: text,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reviews: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                originalReview: { type: Type.STRING },
                authorName: { type: Type.STRING },
                reply: { type: Type.STRING }
              },
              required: ["originalReview", "authorName", "reply"]
            }
          }
        },
        required: ["reviews"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || '{"reviews": []}');
    return data as ProcessingResult;
  } catch (error) {
    console.error("Parse error:", error);
    throw new Error("Не удалось извлечь отзывы. Проверьте входной текст или API ключ.");
  }
}

// --- Components ---
const ReviewItem: React.FC<{ data: ReviewData; index: number }> = ({ data, index }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.reply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-xl hover:shadow-blue-100/50 group">
      <div className="md:w-1/3 bg-slate-50/50 p-6 border-b md:border-b-0 md:border-r border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <UserCircleIcon className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-slate-700 text-sm uppercase tracking-tight truncate">
            {data.authorName || 'Автор'}
          </span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed italic line-clamp-5">
          «{data.originalReview}»
        </p>
      </div>
      
      <div className="flex-1 p-6 flex flex-col">
        <div className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
          Ответ ассистента 💙
        </div>
        
        <div className="flex-grow">
          <p className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-line">
            {data.reply}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className={`mt-6 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${
            copied 
            ? 'bg-green-500 text-white' 
            : 'bg-slate-900 text-white hover:bg-blue-600'
          }`}
        >
          {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
          {copied ? 'Скопировано!' : 'Копировать'}
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<ReviewData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await processReviews(inputText);
      setResults(result.reviews);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка при обращении к AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setResults([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">УЧИ.ДОМА</h1>
              <p className="text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em]">Review Assistant</p>
            </div>
          </div>
          {results.length > 0 && (
            <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 text-xs font-bold uppercase">
              <TrashIcon className="w-4 h-4" /> Очистить
            </button>
          )}
        </header>

        <main className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Вставьте грязный текст или HTML код страницы здесь..."
              className="w-full h-48 p-6 text-slate-600 placeholder-slate-300 resize-none focus:outline-none text-base"
            />
            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-end items-center">
              <button
                onClick={handleProcess}
                disabled={isLoading || !inputText.trim()}
                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                  isLoading || !inputText.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                }`}
              >
                {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                {isLoading ? 'Думаю...' : 'Обработать текст'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3 text-red-700">
              <ExclamationCircleIcon className="w-5 h-5" />
              <p className="font-bold text-xs">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((item, idx) => (
              <ReviewItem key={idx} data={item} index={idx} />
            ))}
          </div>

          {!isLoading && results.length === 0 && (
            <div className="py-20 flex flex-col items-center opacity-10">
              <ClipboardDocumentCheckIcon className="w-16 h-16 text-slate-400 mb-2" />
              <p className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Вставьте текст выше</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// --- Mount App ---
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
