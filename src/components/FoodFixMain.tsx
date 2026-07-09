import { categories, foodItems } from '../data';
import { SearchBar } from './SearchBar';
import { FoodGrid } from './FoodGrid';
import { SupportChat } from './SupportChat';

interface FoodFixMainProps {
  user?: any;
  onLogout?: () => void;
}

export const FoodFixMain = ({ user, onLogout }: FoodFixMainProps) => (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <nav className="bg-white border-b border-slate-100 py-4 px-8 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-orange-500 tracking-tight">Food<span className="text-slate-800">Fix</span></h1>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged in as</span>
              <span className="text-xs font-bold text-slate-700">{user.email}</span>
            </div>
            <button 
              onClick={onLogout}
              className="bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-200 hover:border-orange-200 cursor-pointer"
            >
              Log Out
            </button>
          </div>
        )}
      </nav>

      <header className="py-12 bg-orange-50 text-center px-4">
        {user && (
          <p className="text-xs font-extrabold text-orange-500 uppercase tracking-widest mb-2">
            Welcome back, {user.email.split('@')[0]}!
          </p>
        )}
        <h2 className="text-4xl font-bold text-slate-900 mb-6">Hungry? We've got you covered.</h2>
        <SearchBar />
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <section className="mb-12">
          <div className="flex gap-6 overflow-x-auto pb-4 justify-between">
            {categories.map(c => (
              <button key={c.id} className="flex flex-col items-center gap-2 min-w-20 bg-white p-4 rounded-2xl border border-slate-100 hover:border-orange-200 transition">
                <span className="text-3xl">{c.icon}</span>
                <span className="font-semibold text-xs text-slate-600">{c.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-bold text-slate-900 mb-6">Popular near you</h3>
          <FoodGrid items={foodItems} />
        </section>
      </main>
      
      <SupportChat />
    </div>
);
