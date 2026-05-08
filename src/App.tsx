import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';
import { Calculator, AlertTriangle, Info, Plus, Trash2, Wine, Beer, Beaker, Car, Clock, Utensils, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  { name: 'Cocktail / Spritz', volumeML: 150, abv: 11.0, icon: Beaker },
  { name: 'Shot Superalcolico', volumeML: 40, abv: 40.0, icon: Beaker },
];

export default function App() {
  const [weight, setWeight] = useState<number | ''>(75);
  const [sex, setSex] = useState<'M' | 'F'>('M');
  const [stomach, setStomach] = useState<'empty' | 'full'>('empty');
  const [drinkingDuration, setDrinkingDuration] = useState<number | ''>(2);
  const [timeSinceLastDrink, setTimeSinceLastDrink] = useState<number | ''>(0);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  
  // Custom Drink Input State
  const [customVolume, setCustomVolume] = useState<number | ''>('');
  const [customAbv, setCustomAbv] = useState<number | ''>('');

  const addPresetDrink = (preset: typeof PRESET_DRINKS[0]) => {
    setDrinks(prev => [...prev, { id: crypto.randomUUID(), name: preset.name, volumeML: preset.volumeML, abv: preset.abv }]);
  };

  const addCustomDrink = () => {
    const vol = Number(customVolume);
    const abvVal = Number(customAbv);
    if (vol > 0 && abvVal > 0) {
      setDrinks(prev => [...prev, { id: crypto.randomUUID(), name: `Personalizzato (${vol}ml, ${abvVal}%)`, volumeML: vol, abv: abvVal }]);
      setCustomVolume('');
      setCustomAbv('');
    }
  };

  const removeDrink = (id: string) => {
    setDrinks(prev => prev.filter(d => d.id !== id));
  };

  // Scientific Engine Calculations
  const calculations = useMemo(() => {
    // 1. Grams of Alcohol = Volume(ml) * (ABV / 100) * 0.8
    const totalGrams = drinks.reduce((acc, drink) => {
      return acc + (drink.volumeML * (drink.abv / 100) * 0.8);
    }, 0);

    // 2. Widmark Formula: BAC = (Grams / (Weight * r)) - (beta * Time)
    // Regolazione per lo stomaco pieno/vuoto che altera la rapidità di assorbimento
    const r = sex === 'M' ? 0.73 : 0.66;
    const beta = 0.15; // Corretto empiricamente (0.15 - 0.17 g/l l'ora è il valore medio reale, non 0.017)
    const stomachFactor = stomach === 'full' ? 1.2 : 1.0; 
    
    let rawBac = 0;
    const currentWeight = Number(weight) || 0;
    const currentDuration = Number(drinkingDuration) || 0;
    const currentSinceLast = Number(timeSinceLastDrink) || 0;
    const totalHours = currentDuration + currentSinceLast;

    if (currentWeight > 0 && r > 0) {
      const immediateBac = totalGrams / (currentWeight * r * stomachFactor);
      rawBac = immediateBac - (beta * totalHours);
    }
    
    const bac = Math.max(0, rawBac);

    // 3. Risk Model: Exponential Relative Risk R = e^(2.4 * BAC)
    const risk = bac > 0 ? Math.exp(2.4 * bac) : 1.0;

    const hoursToSober = bac > 0 ? (bac / beta) : 0;

    return { totalGrams, bac, risk, hoursToSober };
  }, [weight, sex, stomach, drinkingDuration, timeSinceLastDrink, drinks]);

  // Chart Data Generation
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
  
  // Evaluation logic for UI feedback
  const getRiskLevel = (bacValue: number) => {
    if (bacValue === 0) return { label: 'Sobrio', color: 'text-zinc-500', bg: 'bg-zinc-100', border: 'border-zinc-200' };
    if (bacValue <= 0.5) return { label: 'Vai tra', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    if (bacValue <= 0.8) return { label: 'no buono', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
    return { label: 'MOLTO MALE', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
  };

  const riskStatus = getRiskLevel(bac);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-4 py-4 sm:px-6 sm:py-5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center space-x-3">
          <Calculator className="w-6 h-6 text-zinc-900 shrink-0" />
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 leading-tight">Schiantometro</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
        
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
          
          <section className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4">Quanto ho fatto schifo?</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Sesso</label>
                <div className="flex rounded-md border border-zinc-200 overflow-hidden min-h-[44px]">
                  <button 
                    onClick={() => setSex('M')}
                    className={cn("flex-1 py-2 px-3 text-sm font-medium transition-colors touch-manipulation", sex === 'M' ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50")}
                  >Uomo</button>
                  <button 
                    onClick={() => setSex('F')}
                    className={cn("flex-1 py-2 px-3 text-sm font-medium transition-colors touch-manipulation", sex === 'F' ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50")}
                  >Donna</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Peso Corporeo (kg)</label>
                <input 
                  type="number" 
                  min="40" max="150" value={weight} 
                  onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Hai magnato??????</label>
                <div className="flex rounded-md border border-zinc-200 overflow-hidden min-h-[44px]">
                  <button 
                    onClick={() => setStomach('empty')}
                    className={cn("flex-1 px-2 py-2 flex items-center justify-center space-x-1.5 text-sm font-medium transition-colors touch-manipulation", stomach === 'empty' ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50")}
                  ><UtensilsCrossed className="w-4 h-4 shrink-0" /> <span>No</span></button>
                  <button 
                    onClick={() => setStomach('full')}
                    className={cn("flex-1 px-2 py-2 flex items-center justify-center space-x-1.5 text-sm font-medium transition-colors touch-manipulation", stomach === 'full' ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50")}
                  ><Utensils className="w-4 h-4 shrink-0" /> <span>Sì</span></button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-sm font-medium text-zinc-700">Durata dell'assunzione (ore)</label>
                    {/* Tooltip hidden on mobile, replaced by descriptive text instead if needed, but we keep it here for simplicity. On mobile users can tap it. */}
                    <div className="relative group flex items-center">
                      <Info className="w-4 h-4 text-zinc-400 touch-manipulation" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[250px] sm:w-64 p-3 bg-zinc-900 font-normal text-zinc-100 text-xs rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible active:opacity-100 active:visible transition-all pointer-events-none z-30 text-center leading-relaxed">
                        Per quanto tempo hai bevuto? (es. una cena di 2 ore). Il fegato inizia a smaltire l'alcol fin dal primo drink.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></div>
                      </div>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    min="0" max="24" step="0.5" value={drinkingDuration === '' ? '' : drinkingDuration} 
                    onChange={(e) => setDrinkingDuration(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-sm font-medium text-zinc-700">Ore dall'ultimo drink</label>
                    <div className="relative group flex items-center">
                      <Info className="w-4 h-4 text-zinc-400 touch-manipulation" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[250px] sm:w-64 p-3 bg-zinc-900 font-normal text-zinc-100 text-xs rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible active:opacity-100 active:visible transition-all pointer-events-none z-30 text-center leading-relaxed">
                        Da quanto tempo hai smesso di bere? Se stai ancora bevendo, inserisci 0.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></div>
                      </div>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    min="0" max="48" step="0.5" value={timeSinceLastDrink === '' ? '' : timeSinceLastDrink} 
                    onChange={(e) => setTimeSinceLastDrink(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4">Quanto ho bevuto?</h2>
            
            {/* Quick Add Presets */}
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-3">
              {PRESET_DRINKS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => addPresetDrink(preset)}
                  className="flex items-center space-x-3 p-3 min-h-[52px] border border-zinc-200 rounded-md hover:bg-zinc-50 active:bg-zinc-100 touch-manipulation transition-colors text-left"
                >
                  <preset.icon className="w-5 h-5 text-zinc-400 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-zinc-800 leading-tight">{preset.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{preset.volumeML}ml · {preset.abv}%</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <label className="text-sm font-medium text-zinc-700 block mb-2 mt-2">Aggiunta Manuale</label>
              <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <input 
                  type="number" placeholder="Vol. (ml)" value={customVolume === '' ? '' : customVolume} onChange={e => setCustomVolume(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm placeholder:text-zinc-400"
                />
                <input 
                  type="number" placeholder="Gradazione (%)" value={customAbv === '' ? '' : customAbv} onChange={e => setCustomAbv(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2.5 sm:py-2 min-h-[44px] border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm placeholder:text-zinc-400"
                />
                <button onClick={addCustomDrink} className="col-span-2 sm:col-span-1 p-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 active:bg-zinc-950 flex items-center justify-center min-h-[44px] touch-manipulation">
                  <Plus className="w-5 h-5" />
                  <span className="ml-1 sm:hidden text-sm font-medium">Aggiungi</span>
                </button>
              </div>
            </div>

            {/* List of current drinks */}
            <div className="pt-6 space-y-2">
              <h3 className="text-xs font-medium text-zinc-500 uppercase">Bevande Inserite</h3>
              {drinks.length === 0 ? (
                <div className="py-8 px-4 border-2 border-dashed border-zinc-200 rounded-lg text-center bg-zinc-50/50">
                  <Beaker className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">Nessuna bevanda inserita.</p>
                  <p className="text-xs text-zinc-400 mt-1">Aggiungi un drink per iniziare i calcoli.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {drinks.map(drink => (
                      <motion.div 
                        key={drink.id}
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex justify-between items-center py-2 px-3 sm:px-4 min-h-[44px] bg-zinc-50 border border-zinc-200 rounded-md overflow-hidden"
                      >
                        <span className="text-sm font-medium text-zinc-700 truncate mr-2">{drink.name}</span>
                        <button onClick={() => removeDrink(drink.id)} className="text-zinc-400 hover:text-red-500 active:text-red-600 p-1.5 touch-manipulation rounded-full hover:bg-zinc-100 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Calculations & Data visualization */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            
            <div className={cn("p-4 sm:p-6 rounded-lg border", riskStatus.border, riskStatus.bg)}>
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-700 mb-1 opacity-70">Tasso Alcolemico (BAC)</div>
              <div className="flex items-baseline space-x-1">
                <span className={cn("text-4xl sm:text-5xl font-bold tracking-tight", riskStatus.color)}>{bac.toFixed(2)}</span>
                <span className="text-base sm:text-lg font-medium text-zinc-600">g/l</span>
              </div>
              <p className="mt-2 text-sm text-zinc-700 font-medium">{riskStatus.label}</p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-1">Rischio Incidente</div>
                <div className="flex items-baseline space-x-1">
                  <motion.span 
                    key={risk}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900"
                  >
                    {risk.toFixed(1)}x
                  </motion.span>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-zinc-500">Rispetto alla sobrietà (1.0x)</p>
              </div>

              {bac > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="flex items-center text-sm font-medium text-zinc-700 space-x-2">
                    <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Smaltimento tra: <strong>~{hoursToSober.toFixed(1)}h</strong></span>
                  </div>
                </div>
              )}
              
              <Car className="absolute -right-4 -bottom-4 w-24 h-24 sm:w-32 sm:h-32 text-zinc-50 opacity-[0.03] pointer-events-none" />
            </div>

          </div>

          <section className="bg-white p-4 sm:p-6 rounded-lg border border-zinc-200 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4 sm:mb-6 flex items-center">
              Schiantometro
              <div className="relative group flex items-center ml-2">
                <Info className="w-4 h-4 text-zinc-400 touch-manipulation" />
                <div className="absolute bottom-full right-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-[250px] sm:w-64 p-3 bg-zinc-900 font-normal text-zinc-100 text-xs rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible active:opacity-100 active:visible transition-all pointer-events-none z-30 text-center leading-relaxed">
                  Mostra l'incremento esponenziale del rischio di incidente in base al BAC.
                  <div className="absolute top-full right-4 sm:left-1/2 sm:-translate-x-1/2 border-4 border-transparent border-t-zinc-900"></div>
                </div>
              </div>
            </h2>

            <div className="h-56 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#A1A1AA" stopOpacity={0.1}/>
                      <stop offset="20%" stopColor="#FBBF24" stopOpacity={0.3}/>
                      <stop offset="60%" stopColor="#F87171" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E4E7" />
                  <XAxis 
                    dataKey="bac" 
                    type="number"
                    tickCount={6}
                    domain={[0, 2.5]}
                    tick={{ fontSize: 11, fill: '#71717A' }} 
                    axisLine={{ stroke: '#E4E4E7' }} 
                    tickLine={false} 
                  />
                  <YAxis 
                    scale="log" 
                    domain={[1, 'dataMax']} 
                    tickFormatter={(value) => `${value}x`}
                    tick={{ fontSize: 11, fill: '#71717A' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toFixed(1)}x`, 'Rischio']}
                    labelFormatter={(label) => `BAC: ${label} g/l`}
                    contentStyle={{ borderRadius: '6px', border: '1px solid #E4E4E7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                  />
                  
                  {/* The curve */}
                  <Area 
                    type="monotone" 
                    dataKey="risk" 
                    stroke="#18181B" 
                    strokeWidth={2} 
                    fill="url(#riskGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#18181B' }}
                  />
                  
                  {/* Legal limit line (0.5 g/l in many EU countries including Italy) */}
                  <ReferenceLine x={0.5} stroke="#F59E0B" strokeDasharray="4 4" label={{ position: 'top', value: 'Limite (0.5)', fill: '#D97706', fontSize: 10 }} />

                  {/* Current BAC Dot */}
                  {bac > 0 && bac <= 2.5 && (
                    <ReferenceDot 
                      x={bac} 
                      y={risk} 
                      r={5} 
                      fill="#EF4444" 
                      stroke="#FFFFFF" 
                      strokeWidth={2}
                      label={{ position: 'right', value: 'Tu', fill: '#DC2626', fontSize: 12, fontWeight: 600 }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="pt-6 sm:pt-8 border-t border-zinc-200 mt-6 sm:mt-8">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Riferimenti Scientifici</h4>
            <ul className="text-[11px] sm:text-xs text-zinc-500 space-y-2 list-disc pl-4 leading-relaxed">
              <li><strong>Formula di Widmark:</strong> Stima della concentrazione di alcol nel sangue basata su massa, sesso e volume assunto, corretta al ribasso per l'ossidazione temporale (tasso di eliminazione medio assunto: 0.15 g/lh).</li>
              <li><strong>Curva del Rischio:</strong> Modello esponenziale del rischio relativo derivato dai dati di <em>Borkenstein et al. (Grand Rapids Study)</em> e reportistica WHO, dove il termine di rischio è proporzionale a e^(2.4 × BAC).</li>
              <li>I calcoli hanno natura puramente statistico-estimativa e non costituiscono un esito di misurazione medico-legale. Tassi di assorbimento e tolleranza variano individualmente.</li>
            </ul>
          </div>

        </div>
      </main>
    </div>
  );
}
