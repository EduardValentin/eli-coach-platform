import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, UserX, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';

const MOCK_CLIENTS = [
  { id: 'c1', name: 'Jane Doe', email: 'jane@example.com', status: 'Active', bundle: '12-Week Recomp', joinDate: 'Oct 01, 2025' },
  { id: 'c2', name: 'Jessica Alba', email: 'jessica@example.com', status: 'Active', bundle: 'Monthly Coaching', joinDate: 'Nov 15, 2025' },
  { id: 'c3', name: 'Emma Stone', email: 'emma@example.com', status: 'Active', bundle: '12-Week Recomp', joinDate: 'Dec 05, 2025' },
  { id: 'c4', name: 'Sarah Jenkins', email: 'sarah@example.com', status: 'Inactive', bundle: 'Monthly Coaching', joinDate: 'Jan 10, 2025' },
  { id: 'c5', name: 'Mia Thermopolis', email: 'mia@example.com', status: 'Inactive', bundle: '8-Week Shred', joinDate: 'Mar 22, 2025' },
];

export function ClientsList() {
  const [clients, setClients] = useState(MOCK_CLIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'All' || client.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleRemoveClient = (id: string, name: string, status: string) => {
    const actionText = status === 'Active' ? 'terminate the subscription for' : 'remove';
    if (window.confirm(`Are you sure you want to ${actionText} ${name}? This action cannot be undone.`)) {
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="w-full pb-12">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-serif text-3xl lg:text-4xl text-[#121212] mb-3 tracking-tight">
            Clients
          </h1>
          <p className="text-neutral-500 font-medium">
            Manage your active roster and past client records.
          </p>
        </div>
        <Link 
          to="/coach/onboard"
          className="px-6 py-3.5 bg-[#C81D6B] text-white text-sm font-semibold rounded-xl hover:bg-[#a31556] transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg shrink-0"
        >
          <Plus size={18} strokeWidth={2.5} />
          Onboard New Client
        </Link>
      </header>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-[#C81D6B] focus:ring-1 focus:ring-[#C81D6B] transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-neutral-200 p-1 rounded-xl shadow-sm">
          {['All', 'Active', 'Inactive'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as 'All' | 'Active' | 'Inactive')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                filter === f 
                  ? 'bg-neutral-100 text-[#121212]' 
                  : 'text-neutral-500 hover:text-[#121212] hover:bg-neutral-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Clients List */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="py-4 px-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Client</th>
                <th className="py-4 px-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Bundle / Plan</th>
                <th className="py-4 px-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Join Date</th>
                <th className="py-4 px-6 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <tr key={client.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-serif text-[#121212] font-semibold shrink-0">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#121212]">{client.name}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                        client.status === 'Active' 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-neutral-600 font-medium">{client.bundle}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500">{client.joinDate}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        <button 
                          onClick={() => handleRemoveClient(client.id, client.name, client.status)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            client.status === 'Active'
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                          }`}
                          title={client.status === 'Active' ? 'Terminate Subscription' : 'Remove from System'}
                        >
                          {client.status === 'Active' ? <ShieldAlert size={14} /> : <UserX size={14} />}
                          {client.status === 'Active' ? 'Terminate' : 'Remove'}
                        </button>

                        <Link 
                          to={`/coach/clients/${client.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:bg-[#121212] hover:text-white hover:border-[#121212] transition-all"
                          title="View Details"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-500 text-sm">
                    No clients found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}