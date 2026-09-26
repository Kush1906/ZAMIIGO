import React, { useState, useEffect } from 'react';
import { Plane, Box, Scale } from 'lucide-react';

export const PremiumLoader: React.FC = () => {
  const [loadingText, setLoadingText] = useState('Initializing Logistics Engine...');
  const [step, setStep] = useState(0);

  useEffect(() => {
    const messages = [
      'Initializing Logistics Engine...',
      'Solving 3D Bin Packing...',
      'Calculating Aircraft Payload...',
      'Optimizing Flight Manifest...'
    ];
    
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingText(messages[currentIndex]);
      setStep(currentIndex);
    }, 800); // Change text every 800ms to feel fast but readable

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden animate-fade-in">
      {/* Decorative ambient background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zamiigo-teal/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-zamiigo-amber/10 rounded-full blur-2xl" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Icon Ring */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
          {/* Radar sweeping pulses */}
          <div className="absolute inset-0 bg-zamiigo-amber/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-4 bg-zamiigo-teal/20 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          
          <div className="relative bg-gradient-to-br from-zamiigo-amber to-amber-500 w-20 h-20 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,182,0,0.5)] transform rotate-3 animate-pulse">
            {step % 3 === 0 && <Plane className="h-10 w-10 text-white transform -rotate-45" />}
            {step % 3 === 1 && <Box className="h-10 w-10 text-white" />}
            {step % 3 === 2 && <Scale className="h-10 w-10 text-white" />}
          </div>
        </div>

        {/* Dynamic Loading Text */}
        <div className="h-6 overflow-hidden relative w-72 text-center">
          <div 
            className="text-slate-700 font-mono font-bold text-sm uppercase tracking-widest transition-opacity duration-300 ease-in-out"
          >
            {loadingText}
          </div>
        </div>

        {/* Sleek Progress Bar */}
        <div className="w-48 h-1.5 bg-slate-200/50 rounded-full mt-6 overflow-hidden relative backdrop-blur-md">
          {/* Moving gradient bar */}
          <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-zamiigo-teal to-zamiigo-amber animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};
