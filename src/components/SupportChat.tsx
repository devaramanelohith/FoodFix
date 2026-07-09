import { useState, useRef, ChangeEvent } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  text: string;
  type: 'user' | 'bot';
  image?: string;
  isImageReviewQuestion?: boolean;
}

export const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: 'Hi! How can I help you today?', type: 'bot' }
  ]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [pendingImageQuery, setPendingImageQuery] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async (text: string = input, image?: { base64: string, mimeType: string }) => {
    if (!text.trim() && !image) return;
    
    if (!image) {
      setMessages(prev => [...prev, { text, type: 'user' }]);
      setInput('');
    }

    try {
      if (image) {
        const response = await fetch('/api/image-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            customer_query: pendingImageQuery, 
            history, 
            image_base64: image.base64, 
            mime_type: image.mimeType 
          }),
        });
        const data = await response.json();
        setMessages(prev => [...prev, { text: data.customer_reply, type: 'bot' }]);
        setHistory(prev => [...prev, { mode: 'image', customer: pendingImageQuery, agent: data }]);
        setPendingImageQuery(null);
      } else {
        const response = await fetch('/api/text-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_query: text, history }),
        });
        const data = await response.json();
        setMessages(prev => [...prev, { text: data.customer_reply, type: 'bot' }]);
        setHistory(prev => [...prev, { mode: 'text', customer: text, agent: data }]);
        
        if (data.image_needed) {
            setPendingImageQuery(text);
            setMessages(prev => [...prev, { text: 'Image review can help here. Do you want to upload an image?', type: 'bot', isImageReviewQuestion: true }]);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { text: 'Sorry, I encountered an error.', type: 'bot' }]);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const imageBase64 = (event.target?.result as string).split(',')[1];
              const mimeType = e.target.files![0].type;
              setMessages(prev => [...prev, { text: 'Uploaded image', type: 'user', image: event.target?.result as string }]);
              handleSend('', { base64: imageBase64, mimeType });
          }
          reader.readAsDataURL(e.target.files[0]);
      }
  }

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-orange-500 text-white p-6 rounded-full shadow-2xl flex items-center gap-2 hover:bg-orange-600 transition font-bold"
        >
          <MessageSquare size={20} />
          <span>Need help?</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-50"
          >
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-orange-500 rounded-t-3xl text-white">
              <h3 className="font-bold text-sm">FoodFix Support</h3>
              <button onClick={() => setIsOpen(false)}><X size={18} className="text-white" /></button>
            </div>
            
            <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-2xl text-xs max-w-[80%] ${m.type === 'user' ? 'bg-orange-500 text-white self-end ml-auto rounded-tr-none' : 'bg-white text-slate-700 self-start shadow-sm rounded-tl-none'}`}>
                  {m.text}
                  {m.image && <img src={m.image} alt="upload" className="mt-2 rounded-lg max-w-full" />}
                  {m.isImageReviewQuestion && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => { setMessages(prev => [...prev, {text: 'Yes', type: 'user'}]); fileInputRef.current?.click(); }} className="bg-orange-500 text-white px-3 py-1 rounded-lg">Yes</button>
                        <button onClick={() => { setMessages(prev => [...prev, {text: 'No', type: 'user'}]); handleSend('No'); }} className="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg">No</button>
                      </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex items-center gap-2 bg-white rounded-b-3xl">
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <button className="p-2 text-slate-400 hover:text-orange-500" onClick={() => fileInputRef.current?.click()}><ImageIcon size={20} /></button>
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                placeholder="Type message..." 
                className="flex-grow text-xs border-none bg-slate-100 p-2 rounded-xl focus:ring-1 focus:ring-orange-500"
              />
              <button onClick={() => handleSend(input)} className="p-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600"><Send size={20} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
