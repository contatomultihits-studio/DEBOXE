
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, LayoutDashboard, Send, Image as ImageIcon, Mic, MicOff, Volume2, VolumeX, Trash2, StopCircle } from 'lucide-react';
import { Expense, Message, ViewMode } from './types';
import { geminiService } from './services/geminiService';
import { ExpenseHistory } from './components/ExpenseHistory';
import { Dashboard } from './components/Dashboard';

// Audio decoding helper from instructions
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CHAT);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: 'Ih, lá vem o gastador. Qual o boleto da vez ou em que futilidade você jogou seu dinheiro no lixo agora?', type: 'text' }
  ]);
  const [inputText, setInputText] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('expenses');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string, image?: string, audio?: string) => {
    if (!text && !image && !audio) return;

    const userMessage: Message = {
      role: 'user',
      content: text || (image ? "Nota fiscal enviada" : (audio ? "Áudio enviado" : "")),
      type: image ? 'image' : (audio ? 'audio' : 'text'),
      dataUrl: image || audio
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setAudioUrl(null);

    try {
      const response = await geminiService.sendMessage(text, image, audio);
      
      setMessages(prev => [...prev, {
        role: 'model',
        content: response.text,
        type: 'text'
      }]);

      if (response.expense) {
        setExpenses(prev => [...prev, response.expense!]);
      }

      // Handle TTS
      if (!isMuted) {
        const audioData = await geminiService.generateSpeech(response.text);
        if (audioData) {
          playAudioResponse(audioData);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: "Meu servidor de deboche caiu. Tenta de novo, seu pão-duro.",
        type: 'text'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const playAudioResponse = async (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const bytes = decodeBase64(base64Audio);
    const audioBuffer = await decodeAudioData(bytes, ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          handleSendMessage('', undefined, reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar mic:", err);
      alert("Dá permissão pro mic aí, senão não escuto seu choro financeiro.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const onFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleSendMessage('', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const clearHistory = () => {
    if (window.confirm("Certeza que quer apagar suas vergonhas financeiras?")) {
      setExpenses([]);
      setMessages([{ role: 'model', content: 'Histórico limpo. Mas sua conta bancária continua no CTI.', type: 'text' }]);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col p-4">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-900 font-black shadow-lg shadow-emerald-500/20">
            $
          </div>
          <span className="hidden md:block font-black text-lg tracking-tighter text-white">
            TIO PATINHAS <span className="text-emerald-500">REVOLTADO</span>
          </span>
        </div>

        <div className="flex-1 space-y-2">
          <button 
            onClick={() => setViewMode(ViewMode.CHAT)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${viewMode === ViewMode.CHAT ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="hidden md:block font-semibold">Julgamento Chat</span>
          </button>
          <button 
            onClick={() => setViewMode(ViewMode.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${viewMode === ViewMode.DASHBOARD ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="hidden md:block font-semibold">Dashboard Pobre</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-all"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
            <span className="hidden md:block font-semibold">{isMuted ? "Mutado" : "Deboxe Ativo"}</span>
          </button>
          <button 
            onClick={clearHistory}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <Trash2 className="w-5 h-5" />
            <span className="hidden md:block font-semibold">Resetar Vida</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {viewMode === ViewMode.CHAT ? (
          <>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-bottom-2 ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                  }`}>
                    {msg.type === 'image' && msg.dataUrl && (
                      <img src={msg.dataUrl} alt="Upload" className="rounded-lg mb-3 max-h-72 w-full object-contain bg-slate-900 border border-slate-700" />
                    )}
                    {msg.type === 'audio' && msg.dataUrl && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-emerald-700/50 rounded-lg border border-emerald-500/30">
                        <Mic className="w-4 h-4" />
                        <span className="text-xs font-semibold">Relato do prejuízo...</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed font-medium">
                      {msg.content.split('```json')[0]}
                    </div>
                    {msg.content.includes('```json') && (
                      <div className="mt-3 bg-slate-950 p-3 rounded-lg border border-slate-700 overflow-x-auto shadow-inner">
                        <pre className="text-[10px] md:text-xs font-mono text-emerald-400 opacity-80">
                          {msg.content.match(/```json\s*([\s\S]*?)\s*```/)?.[0]}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 px-5 py-3 rounded-2xl rounded-tl-none border border-slate-700 flex gap-1.5 items-center">
                    <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-tighter">Bolsolero está digitando...</span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end gap-2 bg-slate-800 rounded-2xl p-2 border border-slate-700 shadow-2xl focus-within:border-emerald-500/50 transition-all">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={onFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-all"
                    title="Upload de nota fiscal"
                  >
                    <ImageIcon className="w-6 h-6" />
                  </button>
                  
                  <button 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                    title="Segure para falar seu gasto"
                  >
                    {isRecording ? <StopCircle className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(inputText);
                      }
                    }}
                    placeholder={isRecording ? "Gravando choro..." : "O que você comprou agora, herdeiro?"}
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 text-slate-200 placeholder-slate-500 min-h-[50px] max-h-32 text-sm md:text-base"
                  />
                  
                  <button 
                    onClick={() => handleSendMessage(inputText)}
                    disabled={!inputText.trim() || isTyping || isRecording}
                    className="p-3 bg-emerald-500 text-slate-900 rounded-xl hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                <div className="flex justify-between items-center px-4 mt-2">
                   <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
                    Financeiro Sincero & Deboxado
                  </p>
                  {isRecording && <span className="text-[10px] text-rose-500 font-bold animate-pulse">SOLTE PARA ENVIAR</span>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <Dashboard expenses={expenses} />
        )}
      </main>

      {/* Right Sidebar - Desktop Only */}
      <aside className="hidden xl:block w-80">
        <ExpenseHistory expenses={expenses} onDelete={deleteExpense} />
      </aside>
    </div>
  );
};

export default App;
