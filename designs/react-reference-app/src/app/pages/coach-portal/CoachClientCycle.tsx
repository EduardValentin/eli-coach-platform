import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import {
  ArrowLeft,
  CalendarDays,
  Droplet,
  FileText,
  Heart,
  History,
} from 'lucide-react';
import { PortalPageHeader } from '../../components/PortalPageHeader';
import { BrandCalendar } from '../../components/BrandCalendar';
import { PortalWidget } from '../../components/PortalWidget';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import {
  VALUE_LG_CLASS,
  WIDGET_SUBHEADING_CLASS,
} from '../../components/typography';
import { useCycle, CYCLE_SYMPTOMS } from '../../context/CycleContext';

const MOCK_CLIENTS: Record<string, string> = {
  'client-1': 'Jane Doe',
  c1: 'Jane Doe',
  c2: 'Jessica Alba',
  c3: 'Emma Stone',
  c4: 'Sarah Jenkins',
  c5: 'Mia Thermopolis',
};

function toISO(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function CoachClientCycle() {
  const { id } = useParams();
  const clientId = id || 'client-1';
  const clientName = MOCK_CLIENTS[clientId] || 'Unknown Client';
  const { getCurrentPhase, getClientPeriodRecords, getClientProfile } =
    useCycle();

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
    <div className="w-full">
      <Link
        to={`/coach/clients/${clientId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={16} /> Back to {clientName}
      </Link>

      <PortalPageHeader
        title={`${clientName}’s Cycle Log`}
        subtitle="View cycle history, current phase, and menstrual health profile."
      />

      {/* Top cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
        <PortalWidget
          presentation="coach"
          title="Current Phase"
          icon={
            <Droplet
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="current-phase-heading"
        >
          {phase ? (
            <div className="flex items-baseline gap-2">
              <span
                className={cn(VALUE_LG_CLASS, 'tracking-tight')}
                style={{ color: phase.phaseColor }}
              >
                {phase.phaseName}
              </span>
              <span className="text-xs font-medium text-text-secondary">
                Day {phase.dayInCycle}
              </span>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No cycle data</p>
          )}
        </PortalWidget>

        <PortalWidget
          presentation="coach"
          title="Cycle Info"
          icon={
            <Heart
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="cycle-info-heading"
        >
          {profile ? (
            <div>
              <p className={cn(WIDGET_SUBHEADING_CLASS, 'mb-1')}>
                {profile.regularity === 'regular' ? 'Regular' : 'Irregular'}{' '}
                &middot; {profile.averageCycleLength}-day cycle
              </p>
              <p className="text-xs text-text-secondary">
                Avg period: {profile.averagePeriodLength} days &middot;{' '}
                {records.length} records logged
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No profile set</p>
          )}
        </PortalWidget>

        <PortalWidget
          presentation="coach"
          title="Conditions"
          icon={
            <FileText
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="conditions-heading"
        >
          {profile && profile.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.conditions.map((c) => (
                <Badge
                  key={c}
                  tone="outline"
                  className="border-cycle-menstrual/20 bg-cycle-menstrual-soft text-cycle-menstrual"
                >
                  {c}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">None reported</p>
          )}
        </PortalWidget>
      </div>

      {/* Client notes */}
      {profile?.notes && (
        <PortalWidget
          presentation="coach"
          title="Client Notes"
          headingId="client-notes-heading"
          className="mb-8"
        >
          <p className="text-sm text-text-secondary leading-relaxed">
            {profile.notes}
          </p>
        </PortalWidget>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <PortalWidget
          presentation="coach"
          title="Cycle Calendar"
          icon={
            <CalendarDays
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="cycle-calendar-heading"
        >
          <BrandCalendar
            mode="single"
            classNames={{
              day_button:
                'w-full aspect-square p-0 font-medium rounded-control inline-flex items-center justify-center relative cursor-default',
            }}
            modifiers={{
              period: (date) => periodDates.has(toISO(date)),
            }}
            modifiersClassNames={{
              period: 'bg-cycle-menstrual/10 text-primary font-medium',
            }}
          />
          <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cycle-menstrual/20 border border-cycle-menstrual/30" />
              <span>Period day</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full ring-2 ring-primary/30" />
              <span>Today</span>
            </div>
          </div>
        </PortalWidget>

        <PortalWidget
          presentation="coach"
          title="Period History"
          icon={
            <History
              aria-hidden="true"
              className="text-brand-secondary"
              size={18}
            />
          }
          headingId="period-history-heading"
          className="self-start"
        >
          {records.length === 0 ? (
            <div className="text-center py-8">
              <Droplet
                size={28}
                className="text-text-secondary/50 mx-auto mb-2"
              />
              <p className="text-sm text-text-secondary">
                No periods logged yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => {
                const duration = record.entries.length;
                const startFormatted = new Date(
                  record.startDate + 'T00:00:00',
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
                const endFormatted = record.endDate
                  ? new Date(record.endDate + 'T00:00:00').toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric' },
                    )
                  : 'Ongoing';

                const allSymptoms = [
                  ...new Set(record.entries.flatMap((e) => e.symptoms)),
                ];

                return (
                  <div
                    key={record.id}
                    className="p-4 rounded-card border border-border bg-muted/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cycle-menstrual" />
                      <p className={WIDGET_SUBHEADING_CLASS}>
                        {startFormatted} &ndash; {endFormatted}
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary mb-2">
                      {duration} days logged
                    </p>
                    {allSymptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {allSymptoms.slice(0, 4).map((s) => (
                          <Badge key={s} tone="muted">
                            {CYCLE_SYMPTOMS.find((cs) => cs.value === s)
                              ?.label ?? s}
                          </Badge>
                        ))}
                        {allSymptoms.length > 4 && (
                          <span className="text-xs text-text-secondary">
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
        </PortalWidget>
      </div>
    </div>
  );
}
