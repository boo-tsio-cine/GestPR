import React, { useState } from 'react';
import { 
  Bot, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  Send, 
  DollarSign, 
  TrendingUp, 
  ArrowRight,
  Database,
  RefreshCw,
  Info,
  Calendar,
  Check
} from 'lucide-react';

export default function AgentCoordinateur() {
  // State for active assignment
  const [selectedValidator, setSelectedValidator] = useState(1); // Default: Jean-Marc
  const [isAssigned, setIsAssigned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: '11:15:02', event: 'Évaluation du dossier #2451 initialisée par l\'Agent Coordinateur.', status: 'info' },
    { id: 2, time: '11:15:03', event: 'Plafond financier requis : 45 000 000 Ar. Validation du rang hiérarchique Niveau 2.', status: 'info' },
    { id: 3, time: '11:15:04', event: 'Filtre d\'éligibilité : Rova (Exclu - Plafond insuffisant), Hery (Exclu - Indisponible).', status: 'warning' },
    { id: 4, time: '11:15:05', event: 'Recommandation optimale : Jean-Marc (Directeur Financier) - Score: 98.4%.', status: 'success' }
  ]);

  // Dossier Info
  const dossier = {
    id: 'DOS-2451',
    titre: 'Achat Équipements Informatiques & Serveurs Web',
    demandeur: 'Tsiory RANDRIA (Département IT)',
    montant: 45000000, // 45 000 000 Ar
    devise: 'Ar',
    fraisAnnexes: '3 500 000 Ar (Douane & Fret)',
    urgence: 'Haute',
    slaHeures: 48,
    dateSoumission: '2026-10-16 10:30'
  };

  // List of Candidate Validators
  const validators = [
    {
      id: 1,
      nom: 'Jean-Marc RAKOTO',
      role: 'Directeur Financier (CFO)',
      avatar: 'JM',
      plafond: 100000000, // 100M Ar
      disponible: true,
      statutPresence: 'Disponible',
      chargeActuelle: 2, // dossiers en cours
      delaiMoyen: '4.2 heures',
      score: 98.4,
      recommande: true,
      eligibilite: 'Eligible',
      motif: 'Plafond suffisant, faible charge en cours et SLA rapide (98.4%).'
    },
    {
      id: 2,
      nom: 'Rova ANDRIA',
      role: 'Responsable Achats',
      avatar: 'RA',
      plafond: 20000000, // 20M Ar
      disponible: true,
      statutPresence: 'Disponible',
      chargeActuelle: 1,
      delaiMoyen: '2.1 heures',
      score: 35.0,
      recommande: false,
      eligibilite: 'Non éligible',
      motif: 'Plafond financier dépassé (Max: 20 000 000 Ar vs Requis: 45 000 000 Ar).'
    },
    {
      id: 3,
      nom: 'Hery RABEMANANJARA',
      role: 'Chef Département Opérations',
      avatar: 'HR',
      plafond: 50000000, // 50M Ar
      disponible: false,
      statutPresence: 'En congé (Retour le 20 Oct)',
      chargeActuelle: 0,
      delaiMoyen: '18.5 heures',
      score: 12.0,
      recommande: false,
      eligibilite: 'Indisponible',
      motif: 'Avis d\'absence détecté dans l\'annuaire (SLA compromis).'
    }
  ];

  // Handler for automatic routing execution
  const handleAutoAssign = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setSelectedValidator(1); // Auto pick Jean-Marc
      setIsAssigned(true);
      setIsProcessing(false);
      const newLog = {
        id: logs.length + 1,
        time: new Date().toLocaleTimeString(),
        event: 'AFFECTATION AUTOMATIQUE : Dossier #2451 transmis au valideur Jean-Marc RAKOTO via C# Orchestrator.',
        status: 'success'
      };
      setLogs(prev => [...prev, newLog]);
    }, 800);
  };

  // Handler for manual routing validation
  const handleManualAssign = () => {
    const val = validators.find(v => v.id === selectedValidator);
    setIsProcessing(true);
    setTimeout(() => {
      setIsAssigned(true);
      setIsProcessing(false);
      const newLog = {
        id: logs.length + 1,
        time: new Date().toLocaleTimeString(),
        event: `AFFECTATION MANUELLE : Dossier #2451 assigné à ${val.nom} (Validation utilisateur).`,
        status: 'warning'
      };
      setLogs(prev => [...prev, newLog]);
    }, 500);
  };

  const handleReset = () => {
    setIsAssigned(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans antialiased">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bot className="w-3.5 h-3.5" /> Agent C# Backend (GestPR)
              </span>
              <span className="text-xs text-slate-400 font-mono">Module : Multi-Agent Routing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Agent Coordinateur — Orientation Automatique du Dossier
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {isAssigned ? (
              <button 
                onClick={handleReset} 
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition flex items-center gap-2 border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" /> Réinitialiser le test
              </button>
            ) : (
              <button
                onClick={handleAutoAssign}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-lg text-sm shadow-lg shadow-indigo-500/20 transition flex items-center gap-2"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                Orientation Automatique (1-Click)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Dossier Overview & Agent Intelligence Criteria */}
        <div className="lg:col-span-1 space-y-6">

          {/* Dossier Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-mono px-2.5 py-1 bg-slate-700 text-indigo-300 rounded-md font-semibold">
                  {dossier.id}
                </span>
                <h2 className="text-lg font-bold text-white mt-2 leading-snug">{dossier.titre}</h2>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-700/60 pt-4 text-sm">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Montant Total :</span>
                <span className="text-xl font-extrabold text-emerald-400 font-mono">
                  {dossier.montant.toLocaleString('fr-FR')} {dossier.devise}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Demandeur :</span>
                <span className="font-medium text-slate-200">{dossier.demandeur}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Niveau d'urgence :</span>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold rounded">
                  <AlertTriangle className="w-3 h-3" /> {dossier.urgence}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">SLA Cible (Délai Max) :</span>
                <span className="inline-flex items-center gap-1 text-slate-200 font-mono font-semibold">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> {dossier.slaHeures} heures
                </span>
              </div>
            </div>

            {/* Assignment Status Banner */}
            {isAssigned && (
              <div className="mt-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Dossier Orienté</div>
                  <div className="text-sm font-medium text-slate-200">
                    Transmis à {validators.find(v => v.id === selectedValidator)?.nom}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Agent Decision Criteria Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4 text-indigo-400 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4" /> Règles d'Analyse du Coordinateur
            </div>
            
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 flex items-start gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block mb-0.5">1. Plafond Financier (Délégation)</strong>
                  Le valideur doit posséder une habilitation supérieure ou égale à <strong>45M Ar</strong>.
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block mb-0.5">2. Disponibilité & Absence</strong>
                  Vérification du calendrier du personnel et détection des congés maladie/annuels.
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200 block mb-0.5">3. Optimisation de Charge SLA</strong>
                  Priorisation des valideurs ayant le moins de dossiers pendants en file d'attente.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT / MAIN COLUMN: Candidate Validators Comparison & Logs */}
        <div className="lg:col-span-2 space-y-6">

          {/* Validator Candidates List */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Valideurs Éligibles & Évaluation des Écarts</h3>
                <p className="text-xs text-slate-400">Analyse comparative calculée en temps réel par le système C# GestPR</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-700 text-slate-300 rounded-md font-mono">
                {validators.length} Candidats
              </span>
            </div>

            {/* Candidates Table / Grid */}
            <div className="space-y-4">
              {validators.map((item) => {
                const isSelected = selectedValidator === item.id;
                const isEligible = item.eligibilite === 'Eligible';

                return (
                  <div 
                    key={item.id}
                    onClick={() => isEligible && setSelectedValidator(item.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 relative cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10' 
                        : isEligible 
                          ? 'bg-slate-900/50 border-slate-700/70 hover:border-slate-600' 
                          : 'bg-slate-900/20 border-slate-800 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left: User & Role info */}
                      <div className="flex items-start gap-3.5">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                          isSelected ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-700 text-slate-200 border-slate-600'
                        }`}>
                          {item.avatar}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-100 text-base">{item.nom}</h4>
                            {item.recommande && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                                Recommandé (IA)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{item.role}</p>

                          {/* Detail Badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                              Plafond: {item.plafond.toLocaleString('fr-FR')} Ar
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              item.disponible 
                                ? 'bg-emerald-500/10 text-emerald-400' 
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {item.statutPresence}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                              Charge: {item.chargeActuelle} dossier(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score & Status */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-slate-400">Score Match</div>
                          <div className={`text-xl font-black font-mono ${
                            item.score > 80 ? 'text-emerald-400' : item.score > 30 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {item.score}%
                          </div>
                        </div>

                        <div className="sm:mt-2">
                          {item.eligibilite === 'Eligible' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Éligible
                            </span>
                          ) : item.eligibilite === 'Indisponible' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                              <Clock className="w-3.5 h-3.5" /> Indisponible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> Plafond dépassé
                            </span>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Explanatory Motif footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{item.motif}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Manual Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Choix sélectionné : <strong className="text-slate-200">{validators.find(v => v.id === selectedValidator)?.nom}</strong>
              </span>

              <button
                onClick={handleManualAssign}
                disabled={isProcessing || isAssigned}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  isAssigned
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                {isAssigned ? 'Orientation déjà effectuée' : 'Valider l\'Orientation Sélectionnée'}
              </button>
            </div>
          </div>

          {/* Audit Trail & MongoDB Event Logs */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Database className="w-4 h-4 text-emerald-400" /> Traçabilité / Audit Trail (MongoDB Event Log)
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 text-slate-400 rounded">
                Live Stream
              </span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-xs space-y-2 max-h-48 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 shrink-0">[{log.time}]</span>
                  <span className={
                    log.status === 'success' ? 'text-emerald-400' :
                    log.status === 'warning' ? 'text-amber-400' : 'text-slate-300'
                  }>
                    {log.event}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}