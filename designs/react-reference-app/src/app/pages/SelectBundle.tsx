import { useSearchParams, useNavigate, Link } from 'react-router';
import { Navbar } from '../components/Navbar';
import { BundleSelector } from '../components/BundleSelector';
import { AlertCircle, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export function SelectBundle() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // In a real app, this token would be validated against a backend
  const token = searchParams.get('token');
  const isValidToken = Boolean(token && token.length > 5);

  const handleCheckout = (bundleId: string) => {
    // Navigate to a mockup checkout or success page
    alert(`Proceeding to checkout with bundle: ${bundleId} and token: ${token}`);
    // navigate('/checkout');
  };

  return (
    <main className="w-full min-h-screen bg-[#FAFAFA] pb-24">
      <Navbar theme="dark" />

      {!isValidToken && (
        <div className="w-full bg-[#C81D6B] text-white pt-24 pb-8 px-6 shadow-md relative z-10">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-start md:items-center gap-4">
              <AlertCircle size={32} className="shrink-0 hidden md:block" />
              <div>
                <h2 className="font-serif text-xl md:text-2xl font-medium mb-1">Assessment Call Required</h2>
                <p className="text-white/90 text-sm md:text-base">
                  You need a unique, secure token from an assessment call to purchase a 1-on-1 coaching bundle.
                </p>
              </div>
            </div>
            <Link 
              to="/book"
              className="shrink-0 px-6 py-3 bg-white text-[#C81D6B] font-medium rounded-sm hover:bg-neutral-100 transition-colors flex items-center gap-2"
            >
              <Calendar size={18} />
              Book Assessment
            </Link>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-6 ${isValidToken ? 'pt-32' : 'pt-16'}`}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#121212] mb-6 tracking-tight">
            Choose Your Bundle
          </h1>
          {isValidToken ? (
            <p className="text-lg text-neutral-600 mb-8">
              Based on our assessment call, select the commitment timeframe that works best for you. Let's get to work.
            </p>
          ) : (
            <p className="text-lg text-neutral-500 mb-8 italic">
              These bundles are available for purchase exclusively after completing an assessment call.
            </p>
          )}
        </div>

        <div className={!isValidToken ? 'opacity-50 grayscale-[0.5] pointer-events-none' : ''}>
          <BundleSelector 
            mode="checkout" 
            onCheckout={handleCheckout} 
            disabled={!isValidToken}
          />
        </div>
      </div>
    </main>
  );
}