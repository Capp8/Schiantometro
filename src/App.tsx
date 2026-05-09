import { useState, useMemo, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';
import { Calculator, Plus, Trash2, Wine, Beer, Beaker, Car, Clock, Utensils, UtensilsCrossed, RefreshCw, Info } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from './lib/utils';

interface Drink {
  id: string;
  name: string;
  volumeML: number;
  abv: number;
}

const PRESET_DRINKS = [
  { name: 'Birra Media', volumeML: 400, abv: 5.0, icon: Beer },
  { name: 'Calice di Vino', volumeML: 125, abv: 12.0, icon: Wine },
  { name: 'Cocktail', volumeML: 150, abv: 11.0, icon: Beaker },
  { name: 'Shot', volumeML: 40, abv: 40.0, icon: Beaker },
];

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { bounce: 0, duration: 800 });
  const display = useTransform(spring, (v) => v.toFixed(2));
  
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  
  return <motion.span>{display}</motion.span>;
}

function AnimatedRisk({ value }: { value: number }) {
  const mv = useMotionValue(1);
  const spring = useSpring(mv, { bounce: 0, duration: 800 });
  const display = useTransform(spring, (v) => v.toFixed(1) + 'x');
  
  useEffect(() => {
    mv.set(value);
  }, [value, mv]);
  
  return <motion.span>{display}</motion.span>;
}

export default function App() {
  const [weight, setWeight] = useState<number | ''>(75);
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [stomach, setStomach] = useState<'empty' | 'full'>('empty');
  const [drinkingDuration, setDrinkingDuration] = useState<number | ''>(2);
  const [timeSinceLastDrink, setTimeSinceLastDrink] = useState<number | ''>(0);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [customVolume, setCustomVolume] = useState<number | ''>('');
  const [customAbv, setCustomAbv] = useState<number | ''>('');
  const [splashes, setSplashes] = useState<{id: number, x: number, y: number}[]>([]);

  const addPresetDrink = (e: React.MouseEvent, preset: typeof PRESET_DRINKS[0]) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSplashes(prev => [...prev, { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top }]);
    setDrinks(prev => [...prev, { id: crypto.randomUUID(), name: preset.name, volumeML: preset.volumeML, abv: preset.abv }]);
  };

  const addCustomDrink = (e: React.MouseEvent) => {
    const vol = Number(customVolume);
    const abvVal = Number(customAbv);
    if (vol > 0 && abvVal > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      setSplashes(prev => [...prev, { id: Date.now(), x: rect.left + rect.width / 2, y: rect.top }]);
      setDrinks(prev => [...prev, { id: crypto.randomUUID(), name: `Pers. (${vol}ml, ${abvVal}%)`, volumeML: vol, abv: abvVal }]);
      setCustomVolume('');
      setCustomAbv('');
    }
  };

  const removeDrink = (id: string) => {
    setDrinks(prev => prev.filter(d => d.id !== id));
  };

  const resetAll = () => {
    setDrinks([]);
    setWeight(75);
    setDrinkingDuration(2);
    setTimeSinceLastDrink(0);
    setStomach('empty');
  };

  const calculations = useMemo(() => {
    const totalGrams = drinks.reduce((acc, drink) => {
      return acc + (drink.volumeML * (drink.abv / 100) * 0.8);
    }, 0);

    const r = sex === 'M' ? 0.73 : 0.66;
    const beta = 0.15;
    const stomachFactor = stomach === 'full' ? 1.2 : 1.0; 
    
    let rawBac = 0;
    const currentWeight = Number(weight) || 0;
    const currentDuration = Number(drinkingDuration) || 0;
    const currentSinceLast = Number(timeSinceLastDrink) || 0;
    const metabolisedHours = (currentDuration / 2) + currentSinceLast;

    if (currentWeight > 0 && r > 0) {
      const immediateBac = totalGrams / (currentWeight * r * stomachFactor);
      rawBac = immediateBac - (beta * metabolisedHours);
    }
    
    const bac = Math.max(0, rawBac);
    const risk = bac > 0 ? Math.exp(2.4 * bac) : 1.0;
    const hoursToSober = bac > 0 ? (bac / beta) : 0;

    return { totalGrams, bac, risk, hoursToSober };
  }, [weight, sex, stomach, drinkingDuration, timeSinceLastDrink, drinks]);

  const chartData = useMemo(() => {
    const data = [];
    for (let b = 0; b <= 2.5; b += 0.05) {
      data.push({
        bac: Number(b.toFixed(2)),
        risk: Number(Math.exp(2.4 * b).toFixed(1))
      });
    }
    return data;
  }, []);

  const { bac, risk, hoursToSober } = calculations;
  
  const getRiskLevel = (bacValue: number) => {
    if (bacValue === 0) return { label: 'SOBRIO', bgContainer: '#a3e635', phrase: 'Guidi meglio di Richi.' };
    if (bacValue <= 0.3) return { label: 'VAI TRA', bgContainer: '#fef08a', phrase: 'Vai tra!' };
    if (bacValue <= 0.5) return { label: 'AL LIMITE', bgContainer: '#facc15', phrase: 'Un boero e saluti la patente.' };
    if (bacValue <= 0.8) return { label: 'NO BUONO', bgContainer: '#fb923c', phrase: 'ti piace il brivido.' };
    if (bacValue <= 1.2) return { label: 'MALE', bgContainer: '#ea580c', phrase: 'Il carrello della spesa puoi ancora guidarlo.' };
    if (bacValue <= 1.5) return { label: 'MOLTO MALE', bgContainer: '#ef4444', phrase: "L'avvocato ringrazia." };
    if (bacValue <= 2.0) return { label: 'KAMIKAZE', bgContainer: '#b91c1c', phrase: 'Stai come i draghi!!' };
    return { label: 'GAME OVER', bgContainer: '#7f1d1d', phrase: 'Come fai a leggere???' };
  };

  const riskStatus = getRiskLevel(bac);

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-['Space_Grotesk'] selection:bg-pink-300 pb-12 transition-colors duration-300">
      
      <AnimatePresence>
        {splashes.map(splash => (
          <motion.div
            key={splash.id}
            initial={{ opacity: 1, y: splash.y, x: splash.x - 20, scale: 0.5 }}
            animate={{ opacity: 0, y: splash.y - 100, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed z-50 pointer-events-none text-4xl"
            onAnimationComplete={() => setSplashes(prev => prev.filter(s => s.id !== splash.id))}
          >
            💦
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.header 
        animate={{ backgroundColor: bac === 0 ? '#ff90e8' : riskStatus.bgContainer }}
        transition={{ duration: 0.5 }}
        className="border-b-4 border-black px-4 py-4 sm:px-6 sm:py-5 sticky top-0 z-20 shadow-[0_4px_0_0_rgba(0,0,0,1)]"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calculator className="w-8 h-8 text-black shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-black uppercase leading-none mt-1">Schiantometro</h1>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        <div className="lg:col-span-5 space-y-8">
          
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 sm:p-7 rounded-xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] space-y-6"
          >
            <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-4">
              <h2 className="text-xl font-black uppercase tracking-tight">Quanto ho fatto schifo?</h2>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 180 }}
                whileTap={{ scale: 0.9 }}
                onClick={resetAll}
                className="bg-red-400 text-black border-2 border-black p-1.5 rounded-md hover:bg-red-500 transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                title="Resetta tutto"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-base font-bold uppercase">Sesso</label>
                <div className="flex border-4 border-black rounded-lg overflow-hidden font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSex('M')}
                    className={cn("flex-1 py-3 px-3 text-sm transition-colors", sex === 'M' ? "bg-[#3b82f6] text-white" : "bg-white hover:bg-gray-100")}
                  >UOMO</motion.button>
                  <div className="w-1 bg-black"></div>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSex('F')}
                    className={cn("flex-1 py-3 px-3 text-sm transition-colors", sex === 'F' ? "bg-[#ff90e8] text-black" : "bg-white hover:bg-gray-100")}
                  >DONNA</motion.button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-base font-bold uppercase">Peso (kg)</label>
                <input 
                  type="number" 
                  min="40" max="150" value={weight} 
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 min-h-[52px] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-lg focus:outline-none focus:bg-yellow-100 text-lg font-bold transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-base font-bold uppercase">Hai magnato??</label>
                <div className="flex border-4 border-black rounded-lg overflow-hidden font-bold shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStomach('empty')}
                    className={cn("flex-1 px-2 py-3 flex items-center justify-center space-x-2 text-sm transition-colors", stomach === 'empty' ? "bg-red-400 text-black" : "bg-white hover:bg-gray-100")}
                  ><UtensilsCrossed className="w-5 h-5 shrink-0" /> <span>NO</span></motion.button>
                  <div className="w-1 bg-black"></div>
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStomach('full')}
                    className={cn("flex-1 px-2 py-3 flex items-center justify-center space-x-2 text-sm transition-colors", stomach === 'full' ? "bg-green-400 text-black" : "bg-white hover:bg-gray-100")}
                  ><Utensils className="w-5 h-5 shrink-0" /> <span>SÌ</span></motion.button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-base font-bold uppercase flex items-center gap-2 relative group z-30 w-fit">
                    Durata (ore)
                    <Info className="w-5 h-5 text-black cursor-help" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white border-4 border-black font-bold text-black text-xs rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none text-center normal-case">
                      Per quanto tempo hai bevuto? (es. una cena di 2 ore). Il fegato inizia a smaltire l'alcol fin dal primo drink.
                    </div>
                  </label>
                  <input 
                    type="number" 
                    min="0" max="24" step="0.5" value={drinkingDuration === '' ? '' : drinkingDuration} 
                    onChange={(e) => setDrinkingDuration(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 min-h-[52px] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-lg focus:outline-none focus:bg-yellow-100 text-lg font-bold transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base font-bold uppercase flex items-center gap-2 relative group z-20 w-fit">
                    Da quanto hai smesso di bere?
                    <Info className="w-5 h-5 text-black cursor-help shrink-0" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white border-4 border-black font-bold text-black text-xs rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none text-center normal-case">
                      Ore trascorse dall'ultimo drink. Se stai ancora bevendo o hai appena finito, inserisci 0.
                    </div>
                  </label>
                  <input 
                    type="number" 
                    min="0" max="48" step="0.5" value={timeSinceLastDrink === '' ? '' : timeSinceLastDrink} 
                    onChange={(e) => setTimeSinceLastDrink(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 min-h-[52px] border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-lg focus:outline-none focus:bg-yellow-100 text-lg font-bold transition-colors"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#c4b5fd] p-5 sm:p-7 rounded-xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] space-y-6"
          >
            <h2 className="text-xl font-black uppercase tracking-tight mb-4 border-b-4 border-black pb-2">Quanto ho bevuto?</h2>
            
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
              {PRESET_DRINKS.map((preset, idx) => (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2, x: -2, boxShadow: '6px 6px 0 0 #000' }}
                  whileTap={{ scale: 0.95, y: 0, x: 0, boxShadow: '0px 0px 0 0 #000' }}
                  key={idx}
                  onClick={(e) => addPresetDrink(e, preset)}
                  className="flex items-center space-x-3 p-3 min-h-[60px] bg-white border-4 border-black rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-all text-left"
                >
                  <div className="p-2 bg-yellow-300 border-2 border-black rounded-lg shrink-0">
                    <preset.icon className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <div className="text-sm font-bold uppercase leading-tight">{preset.name}</div>
                    <div className="text-xs font-bold text-gray-700 mt-1">{preset.volumeML}ml · {preset.abv}%</div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="pt-6 border-t-4 border-black mt-6">
              <label className="text-base font-bold uppercase block mb-3">Aggiunta Manuale</label>
              <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3">
                <input 
                  type="number" placeholder="Vol. (ml)" value={customVolume === '' ? '' : customVolume} onChange={e => setCustomVolume(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-3 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-lg focus:outline-none focus:bg-yellow-100 text-sm font-bold placeholder:text-gray-500"
                />
                <input 
                  type="number" placeholder="Grad (%)" value={customAbv === '' ? '' : customAbv} onChange={e => setCustomAbv(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-3 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-lg focus:outline-none focus:bg-yellow-100 text-sm font-bold placeholder:text-gray-500"
                />
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2, x: -2, boxShadow: '6px 6px 0 0 #000' }}
                  whileTap={{ scale: 0.95, y: 0, x: 0, boxShadow: '0px 0px 0 0 #000' }}
                  onClick={addCustomDrink} 
                  className="col-span-2 sm:col-span-1 p-3 bg-black text-white border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] rounded-lg flex items-center justify-center font-bold transition-all"
                >
                  <Plus className="w-6 h-6" />
                  <span className="ml-2 sm:hidden uppercase tracking-wider">Aggiungi</span>
                </motion.button>
              </div>
            </div>

            <div className="pt-6 space-y-3">
              <h3 className="text-base font-black uppercase bg-white text-black border-4 border-black inline-block px-3 py-1 rounded-md shadow-[4px_4px_0_0_rgba(0,0,0,1)] -rotate-2">Bevande Inserite</h3>
              {drinks.length === 0 ? (
                <div className="py-8 px-4 border-4 border-dashed border-black rounded-xl text-center bg-white/50 mt-4">
                  <Beaker className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-base font-bold uppercase">Nessuna bevanda.</p>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  <AnimatePresence initial={false}>
                    {drinks.map(drink => (
                      <motion.div 
                        key={drink.id}
                        initial={{ opacity: 0, scale: 0.9, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 20 }}
                        className="flex justify-between items-center py-2 px-3 sm:px-4 bg-white border-4 border-black rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden"
                      >
                        <span className="text-sm font-bold uppercase truncate mr-2">{drink.name}</span>
                        <motion.button 
                          whileHover={{ scale: 1.1, rotate: 10 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeDrink(drink.id)} 
                          className="bg-red-400 border-2 border-black text-black p-2 rounded-full transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.section>

        </div>

        <div className="lg:col-span-7 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <motion.div 
              animate={{ 
                backgroundColor: riskStatus.bgContainer,
              }}
              transition={{ duration: 0.5 }}
              className={cn("p-6 rounded-xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]")}
            >
              <div className="text-sm font-black uppercase tracking-widest mb-2 opacity-80 border-b-2 border-black pb-1 inline-block text-black">BAC (g/l)</div>
              <div className="flex items-baseline space-x-2 mt-4 text-black">
                <div className="text-6xl font-black tracking-tighter drop-shadow-md">
                  <AnimatedNumber value={bac} />
                </div>
              </div>
              <div className="flex flex-col items-start mt-6 space-y-3">
                <motion.div 
                  key={riskStatus.label}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={cn("text-xl font-black uppercase px-4 py-2 inline-block rounded-md shadow-[4px_4px_0_0_rgba(0,0,0,1)] border-4 border-black rotate-1", bac > 0.8 ? "bg-black text-white" : "bg-white text-black")}
                >
                  {riskStatus.label}
                </motion.div>
                
                <motion.div
                  key={riskStatus.phrase}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base font-bold text-black bg-white/70 border-2 border-black px-3 py-2 rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)] -rotate-1"
                >
                  {riskStatus.phrase}
                </motion.div>
              </div>
            </motion.div>

            <div className="bg-[#facc15] p-6 rounded-xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] relative overflow-hidden flex flex-col justify-between">
              <div className="relative z-10">
                <div className="text-sm font-black uppercase tracking-widest text-black mb-2 opacity-80 border-b-2 border-black pb-1 inline-block">Rischio Incidente</div>
                <div className="flex items-baseline space-x-1 mt-4">
                  <div className="text-6xl font-black tracking-tighter text-black drop-shadow-md">
                    <AnimatedRisk value={risk} />
                  </div>
                </div>
                <p className="mt-2 text-sm font-bold text-black bg-white inline-block px-2 py-1 border-2 border-black -rotate-1 shadow-[2px_2px_0_0_rgba(0,0,0,1)]">Rispetto a sobrietà</p>
              </div>

              {bac > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 pt-4 border-t-4 border-black relative z-10"
                >
                  <div className="flex items-center text-sm sm:text-base font-black text-black space-x-2 bg-white px-3 py-2 border-2 border-black rounded-lg shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                    <Clock className="w-5 h-5 shrink-0" />
                    <span>SMALTIMENTO: <strong>~{hoursToSober.toFixed(1)}h</strong></span>
                  </div>
                </motion.div>
              )}
              
              <Car className="absolute -right-10 -bottom-10 w-48 h-48 text-black opacity-10 pointer-events-none -rotate-12" />
            </div>

          </div>

          <section className="bg-white p-6 rounded-xl border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase tracking-tight mb-6 flex items-center border-b-4 border-black pb-2">
              Curva del Rischio
            </h2>

            <div className="h-64 sm:h-80 w-full border-4 border-black rounded-lg p-2 bg-[#f8fafc] shadow-inner relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#a3e635" stopOpacity={0.8}/>
                      <stop offset="20%" stopColor="#facc15" stopOpacity={0.8}/>
                      <stop offset="60%" stopColor="#fb923c" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                  <XAxis 
                    dataKey="bac" 
                    type="number"
                    tickCount={6}
                    domain={[0, 2.5]}
                    tick={{ fontSize: 12, fill: '#000', fontWeight: 'bold', fontFamily: 'Space Grotesk' }} 
                    axisLine={{ stroke: '#000', strokeWidth: 3 }} 
                    tickLine={{ stroke: '#000', strokeWidth: 3 }} 
                  />
                  <YAxis 
                    scale="log" 
                    domain={[1, 'dataMax']} 
                    tickFormatter={(value) => `${value}x`}
                    tick={{ fontSize: 12, fill: '#000', fontWeight: 'bold', fontFamily: 'Space Grotesk' }} 
                    axisLine={{ stroke: '#000', strokeWidth: 3 }} 
                    tickLine={{ stroke: '#000', strokeWidth: 3 }} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}x`, 'RISCHIO']}
                    labelFormatter={(label) => `BAC: ${label} g/l`}
                    contentStyle={{ borderRadius: '0px', border: '4px solid #000', boxShadow: '4px 4px 0 0 rgba(0,0,0,1)', fontSize: '14px', fontWeight: 'bold', fontFamily: 'Space Grotesk', backgroundColor: '#fff', textTransform: 'uppercase', color: '#000' }}
                  />
                  
                  <Area 
                    type="monotone" 
                    dataKey="risk" 
                    stroke="#000" 
                    strokeWidth={4} 
                    fill="url(#riskGradient)"
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 3, stroke: '#000', fill: '#fff' }}
                  />
                  
                  <ReferenceLine x={0.5} stroke="#000" strokeDasharray="6 6" strokeWidth={2} label={{ position: 'top', value: 'LIMITE (0.5)', fill: '#000', fontSize: 12, fontWeight: 'bold', fontFamily: 'Space Grotesk' }} />

                  {bac > 0 && bac <= 2.5 && (
                    <ReferenceDot 
                      x={bac} 
                      y={risk} 
                      r={8} 
                      fill="#ef4444" 
                      stroke="#000" 
                      strokeWidth={3}
                      label={{ position: 'right', value: 'TU', fill: '#000', fontSize: 16, fontWeight: 900, fontFamily: 'Space Grotesk' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
