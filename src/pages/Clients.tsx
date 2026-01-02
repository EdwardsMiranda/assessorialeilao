
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Client } from '../types';
import { UserPlus, Search, Trash2, Phone, Mail, MapPin, DollarSign, Briefcase, Sparkles, Edit, X } from 'lucide-react';
import { expandInvestmentThesis } from '../services/geminiService';

export const Clients: React.FC = () => {
    const { clients, addClient, removeClient, updateClient } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    // New Client Form
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [cities, setCities] = useState('');
    const [maxBid, setMaxBid] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
    const [isExpanding, setIsExpanding] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const handleAiExpand = async () => {
        if (!cities) return;
        setIsExpanding(true);
        const expandedCities = await expandInvestmentThesis(cities);
        if (expandedCities && expandedCities.length > 0) {
            // Merge with existing avoiding duplicates, but simplified here to just append or replace if it looks like a region name
            setCities(expandedCities.join(', '));
        }
        setIsExpanding(false);
    };

    const handleCancelEdit = () => {
        setEditingClient(null);
        setName(''); setPhone(''); setEmail(''); setCities(''); setMaxBid(''); setNotes(''); setSelectedPaymentMethods([]);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setName(client.name);
        setPhone(client.phone);
        setEmail(client.email || '');
        setCities(client.investmentThesis.cities.join(', '));
        setMaxBid(client.investmentThesis.maxBidValue.toString());
        setNotes(client.investmentThesis.notes || '');
        setSelectedPaymentMethods(client.investmentThesis.paymentMethods);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !phone) return;

        if (editingClient) {
            // Update
            await updateClient(editingClient.id, {
                name,
                phone,
                email,
                investmentThesis: {
                    cities: cities.split(',').map(c => c.trim()).filter(Boolean),
                    maxBidValue: parseFloat(maxBid) || 0,
                    paymentMethods: selectedPaymentMethods,
                    notes
                }
            });
            handleCancelEdit(); // Reset form
        } else {
            // Create
            const newClient: Client = {
                id: Date.now().toString(),
                name,
                phone,
                email,
                investmentThesis: {
                    cities: cities.split(',').map(c => c.trim()).filter(Boolean),
                    maxBidValue: parseFloat(maxBid) || 0,
                    paymentMethods: selectedPaymentMethods,
                    notes
                },
                addedAt: new Date().toISOString()
            };
            addClient(newClient);
            // Reset
            setName(''); setPhone(''); setEmail(''); setCities(''); setMaxBid(''); setNotes(''); setSelectedPaymentMethods([]);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.investmentThesis.cities.some(city => city.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Investidores (CRM)</h2>
                <p className="text-gray-500">Gerencie sua base de clientes e teses de investimento.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Add Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {editingClient ? <Edit className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-green-600" />}
                        {editingClient ? 'Editar Investidor' : 'Cadastrar Investidor'}
                    </h3>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input
                                type="text" required value={name} onChange={e => setName(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                                placeholder="Ex: Investidor Ltda"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp</label>
                                <input
                                    type="text" required value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email (Opcional)</label>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                                />
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-3 mt-2">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tese de Investimento</p>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Cidades de Interesse (Separar por vírgula)</label>
                                    <div className="relative">
                                        <input
                                            type="text" value={cities} onChange={e => setCities(e.target.value)}
                                            className="w-full p-2 pr-8 border border-gray-300 rounded bg-white text-sm"
                                            placeholder="São Paulo, Campinas, Santos ou 'Grande SP'..."
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAiExpand}
                                            disabled={isExpanding || !cities}
                                            className="absolute right-1 top-1 p-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                            title="Expandir região com IA (ex: 'Grande SP')"
                                        >
                                            <Sparkles size={16} className={isExpanding ? "animate-spin" : ""} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Dica: Digite uma região (ex: "Litoral Norte") e clique na <Sparkles className="w-3 h-3 inline" /> para expandir.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Valor Máximo de Lance (R$)</label>
                                    <input
                                        type="number" value={maxBid} onChange={e => setMaxBid(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <textarea
                                        value={notes} onChange={e => setNotes(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded bg-white text-sm"
                                        rows={2}
                                        placeholder="Ex: Prefere imóveis comerciais..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Formas de Pagamento (Pode selecionar várias)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['À vista', 'Financiado', 'FGTS', 'Parcelado'].map(method => (
                                            <label key={method} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPaymentMethods.includes(method)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedPaymentMethods([...selectedPaymentMethods, method]);
                                                        } else {
                                                            setSelectedPaymentMethods(selectedPaymentMethods.filter(m => m !== method));
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>{method}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {editingClient && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="w-full py-2 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300 flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" /> Cancelar
                                </button>
                            )}
                            <button
                                type="submit"
                                className={`w-full py-2 font-bold rounded text-white ${editingClient ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                                {editingClient ? 'Atualizar' : 'Salvar Investidor'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Client List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Toolbar */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700">Base de Clientes</h3>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar investidor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 p-2 w-full border border-gray-300 rounded text-sm bg-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredClients.length === 0 ? (
                            <div className="col-span-2 text-center py-10 text-gray-500">Nenhum cliente encontrado.</div>
                        ) : (
                            filteredClients.map(client => (
                                <div key={client.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(client)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                            title="Editar"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => removeClient(client.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Remover"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{client.name}</h4>
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {client.phone}</span>
                                                {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.email}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-xs space-y-2">
                                        <div className="flex gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-700 font-medium">
                                                {client.investmentThesis.cities.length > 0 ? client.investmentThesis.cities.join(', ') : 'Sem região definida'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-gray-700">
                                                Até <span className="font-bold text-green-700">{formatCurrency(client.investmentThesis.maxBidValue)}</span>
                                            </span>
                                        </div>
                                        {client.investmentThesis.notes && (
                                            <div className="flex gap-2 border-t pt-2 border-gray-200 mt-2">
                                                <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-gray-600 italic">{client.investmentThesis.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
