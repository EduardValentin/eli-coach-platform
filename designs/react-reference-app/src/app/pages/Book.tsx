import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, Video, ChevronLeft, CircleCheck, User, Mail, ArrowRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Link } from 'react-router';

import { DateTimePicker } from '../components/DateTimePicker';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useCheckins } from '../context/CheckinContext';
import { toISODate } from '../utils/dateFormatters';

type Step = 'date-time' | 'details' | 'success';

const ASSESSMENT_TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '11:00 AM',
  '1:00 PM', '2:30 PM', '3:00 PM', '4:00 PM', '4:30 PM'
];

export function Book() {
  const [step, setStep] = useState<Step>('date-time');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const { getBookedSlots } = useCheckins();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const maxDate = addDays(today, 30);

  const bookedSlots = useMemo(
    () => selectedDate ? getBookedSlots(toISODate(selectedDate)) : [],
    [selectedDate, getBookedSlots]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background abstract elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#C81D6B]/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[#00796B]/5 blur-[100px] pointer-events-none" />

      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-neutral-100 flex flex-col md:flex-row overflow-hidden relative z-10 min-h-[650px]">

        {/* LEFT PANEL - INFO */}
        <div className="w-full md:w-[35%] bg-neutral-50/50 p-8 md:p-10 border-b md:border-b-0 md:border-r border-neutral-100 flex flex-col">
          <Link to="/" className="text-[#121212] font-serif font-bold tracking-wide text-xl mb-12 hover:text-[#C81D6B] transition-colors inline-block w-fit">
            Eli Fitness
          </Link>

          <img
            src="https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=facearea&facepad=2&w=150&h=150&q=80"
            alt="Eli"
            className="w-16 h-16 rounded-full object-cover mb-6 shadow-sm border border-neutral-200"
          />

          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-2">Assessment Call</h2>
          <h1 className="text-3xl font-serif text-[#121212] mb-6 font-medium">Start Your Plan</h1>

          <div className="space-y-4 text-neutral-600 mb-8 font-medium">
            <div className="flex items-center gap-3 text-[15px]">
              <Clock className="w-5 h-5 text-neutral-400" />
              <span>30 min session</span>
            </div>
            <div className="flex items-center gap-3 text-[15px]">
              <Video className="w-5 h-5 text-neutral-400" />
              <span>Google Meet (Video)</span>
            </div>
          </div>

          <p className="text-[15px] leading-relaxed text-neutral-500 font-medium">
            In this session, we'll discuss your goals, past fitness experience, and any dietary restrictions to design a personalized plan you can actually stick to.
          </p>

          {selectedDate && selectedTime && step === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <CalendarIcon className="w-5 h-5 text-[#C81D6B] mt-0.5" />
                <div>
                  <p className="font-semibold text-[#121212]">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                  <p className="text-[#C81D6B] font-medium">{selectedTime}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT PANEL - INTERACTION */}
        <div className="w-full md:w-[65%] p-6 md:p-10 relative bg-white">
          <AnimatePresence mode="wait">

            {/* STEP 1: DATE AND TIME */}
            {step === 'date-time' && (
              <motion.div
                key="step-date"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <h3 className="text-xl font-semibold mb-6 text-[#121212]">Select a Date & Time</h3>

                <DateTimePicker
                  selectedDate={selectedDate}
                  onDateChange={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                  selectedTime={selectedTime}
                  onTimeChange={setSelectedTime}
                  bookedSlots={bookedSlots}
                  onSubmit={() => setStep('details')}
                  submitLabel="Next"
                  disableWeekends
                  maxDate={maxDate}
                  timeSlots={ASSESSMENT_TIME_SLOTS}
                />
              </motion.div>
            )}

            {/* STEP 2: DETAILS */}
            {step === 'details' && (
              <motion.div
                key="step-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col max-w-md mx-auto"
              >
                <button
                  onClick={() => setStep('date-time')}
                  className="w-10 h-10 rounded-full bg-neutral-50 hover:bg-neutral-100 flex items-center justify-center text-neutral-600 transition-colors mb-6 -ml-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h3 className="text-2xl font-semibold mb-2 text-[#121212]">Almost there</h3>
                <p className="text-neutral-500 mb-8 font-medium">Please provide your details to secure your slot.</p>

                <form onSubmit={handleSubmit} className="space-y-5 flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-neutral-700 font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input
                        id="name"
                        required
                        placeholder="Jane Doe"
                        className="pl-9 h-12 bg-neutral-50/50 border-neutral-200 focus:border-[#C81D6B] focus:ring-[#C81D6B]"
                        value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-neutral-700 font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="jane@example.com"
                        className="pl-9 h-12 bg-neutral-50/50 border-neutral-200 focus:border-[#C81D6B] focus:ring-[#C81D6B]"
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-neutral-700 font-medium">Anything to share beforehand? (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="e.g. recovering from a knee injury"
                      className="resize-none h-24 bg-neutral-50/50 border-neutral-200 focus:border-[#C81D6B] focus:ring-[#C81D6B]"
                      value={formData.notes}
                      onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-[#C81D6B] hover:bg-[#A31657] text-white rounded-xl text-base font-semibold transition-colors disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        />
                      ) : (
                        'Schedule Assessment'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 'success' && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-12"
              >
                <div className="w-20 h-20 bg-[#C81D6B]/10 rounded-full flex items-center justify-center mb-6">
                  <CircleCheck className="w-10 h-10 text-[#C81D6B]" />
                </div>

                <h3 className="text-3xl font-serif font-medium text-[#121212] mb-4">You're booked!</h3>
                <p className="text-neutral-600 text-lg max-w-md mx-auto mb-8 font-medium leading-relaxed">
                  A calendar invitation with your Google Meet link has been sent to <strong className="text-neutral-900">{formData.email}</strong>.
                </p>

                <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6 w-full max-w-sm mb-10 text-left">
                  <p className="text-sm text-neutral-500 font-medium mb-1">When</p>
                  <p className="font-semibold text-[#121212] mb-4">
                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} <br/>
                    {selectedTime}
                  </p>

                  <p className="text-sm text-neutral-500 font-medium mb-1">Where</p>
                  <p className="font-semibold text-[#121212] flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#C81D6B]" />
                    Google Meet
                  </p>
                </div>

                <Link to="/">
                  <Button variant="outline" className="h-12 px-8 rounded-xl font-semibold border-neutral-200 hover:bg-neutral-50 text-neutral-700">
                    Return to Home
                  </Button>
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
