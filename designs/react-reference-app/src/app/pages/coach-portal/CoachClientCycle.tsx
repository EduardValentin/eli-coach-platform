import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Droplet, Heart, FileText } from 'lucide-react';
import { BrandCalendar } from '../../components/BrandCalendar';
import { useCycle, CYCLE_SYMPTOMS } from '../../context/CycleContext';

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe', 'c1': 'Jane Doe', 'c2': 'Jessica Alba', 'c3': 'Emma Stone', 'c4': 'Sarah Jenkins', 'c5': 'Mia Thermopolis',
};

const FLOW_COLORS: Record<string, string> = {
  light: '#C13852',
  medium: '#CA2E50',
  heavy: '#C81D6B',
  spotting: '#FFB4C6',
};

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function CoachClientCycle() {
  const { id } = useParams();
  const clientId = id || 'client-1';
  const clientName = MOCK_CLIENTS[clientId] || 'Unknown Client';
  const { getCurrentPhase, getClientPeriodRecords, getClientProfile } = useCycle();

  const phase = getCurrentPhase(clientId);
  const records = getClientPeriodRecords(clientId);
  const profile = getClientProfile(clientId);

  const periodDates = useMemo(() => {
    const dates = new Set<string>();
    for (const record of records) {
      for (const entry of record.entries) {
        dates.add(entry.date);
      }
    }
    return dates;
  }, [records]);

  return (
    <div className="w-full pb-12">
      <Link to={`/coach/clients/${clientId}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to {clientName}
      </Link>

      <header className="mb-10">
        <h1 className="font-serif text-3xl lg:text-4xl text-foreground mb-2 tracking-tight">
          {clientName}&apos;s Cycle Log
        </h1>
        <p className="text-muted-foreground font-medium">
          View cycle history, current phase, and menstrual health profile.
        </p>
      </header>

      {/* Top cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
        {/* Current Phase */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current Phase</span>
            <Droplet size={16} className="text-brand" strokeWidth={2.5} />
          </div>
          {phase ? (
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl" style={{ color: phase.phaseColor }}>
                {phase.phaseName}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Day {phase.dayInCycle}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No cycle data</p>
          )}
        </motion.div>

        {/* Cycle Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cycle Info</span>
            <Heart size={16} className="text-[#C13852]" strokeWidth={2.5} />
          </div>
          {profile ? (
            <div>
              <p className="font-semibold text-sm text-foreground mb-1">
                {profile.regularity === 'regular' ? 'Regular' : 'Irregular'} &middot; {profile.averageCycleLength}-day cycle
              </p>
              <p className="text-xs text-muted-foreground">
                Avg period: {profile.averagePeriodLength} days &middot; {records.length} records logged
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No profile set</p>
          )}
        </motion.div>

        {/* Conditions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Conditions</span>
            <FileText size={16} className="text-muted-foreground" strokeWidth={2.5} />
          </div>
          {profile && profile.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.conditions.map(c => (
                <span key={c} className="text-xs font-semibold bg-[#C13852]/10 text-brand px-2.5 py-1 rounded-lg">
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">None reported</p>
          )}
        </motion.div>
      </div>

      {/* Client notes */}
      {profile?.notes && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card p-6 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 mb-8"
        >
          <h2 className="font-serif text-lg text-foreground font-semibold mb-3">Client Notes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.notes}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50"
        >
          <h2 className="font-serif text-xl text-foreground font-semibold mb-6">Cycle Calendar</h2>
          <BrandCalendar
            mode="single"
            classNames={{
              day: 'w-full aspect-square p-0 font-medium rounded-xl inline-flex items-center justify-center relative cursor-default',
            }}
            modifiers={{
              period: (date) => periodDates.has(toISO(date)),
            }}
            modifiersClassNames={{
              period: 'bg-[#C13852]/10 text-brand font-semibold',
            }}
          />
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#C13852]/20 border border-[#C13852]/30" />
              <span>Period day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full ring-2 ring-brand/30" />
              <span>Today</span>
            </div>
          </div>
        </motion.div>

        {/* Period History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card p-6 lg:p-8 rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-border/50 self-start"
        >
          <h2 className="font-serif text-xl text-foreground font-semibold mb-6">Period History</h2>
          {records.length === 0 ? (
            <div className="text-center py-8">
              <Droplet size={28} className="text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No periods logged yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map(record => {
                const duration = record.entries.length;
                const startFormatted = new Date(record.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const endFormatted = record.endDate
                  ? new Date(record.endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Ongoing';

                const allSymptoms = [...new Set(record.entries.flatMap(e => e.symptoms))];

                return (
                  <div key={record.id} className="p-4 rounded-2xl border border-border bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C13852]" />
                      <p className="font-semibold text-sm text-foreground">
                        {startFormatted} &ndash; {endFormatted}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{duration} days logged</p>
                    {allSymptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {allSymptoms.slice(0, 4).map(s => (
                          <span key={s} className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {CYCLE_SYMPTOMS.find(cs => cs.value === s)?.label ?? s}
                          </span>
                        ))}
                        {allSymptoms.length > 4 && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            +{allSymptoms.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
