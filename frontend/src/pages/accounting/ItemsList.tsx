import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { 
  Plus, Loader2, AlertCircle, Trash2, ShoppingBag, Edit2
} from 'lucide-react';

export const ItemsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Items Catalog
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const response = await api.get('/items');
      return response.data.data;
    }
  });

  // Create/Edit Item Mutation
  const itemMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingItem) {
        const response = await api.put(`/items/${editingItem._id}`, payload);
        return response.data.data;
      } else {
        const response = await api.post('/items', payload);
        return response.data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setShowAddModal(false);
      setEditingItem(null);
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to save item details.');
    }
  });

  // Delete Item Mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    }
  });

  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      sku: formData.get('sku'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      rate: Number(formData.get('rate')),
      unit: formData.get('unit'),
      gstRate: Number(formData.get('gstRate'))
    };

    itemMutation.mutate(payload);
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Items Master</h1>
          <p className="text-xs text-slate-500 dark:text-dark-400">Manage billing products, consulting fees, statutory filing rates, and GST catalog metrics.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowAddModal(true); }}
          className="btn-tri-45 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center space-x-2 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add SKU</span>
        </button>
      </div>

      {/* Catalog Grid */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-dark-950 text-slate-400 dark:text-dark-500 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-dark-800/80">
                <th className="py-4 px-6">SKU Code</th>
                <th className="py-4 px-4">Item Name</th>
                <th className="py-4 px-4">Rate (₹)</th>
                <th className="py-4 px-4">Tax Option</th>
                <th className="py-4 px-4">Unit type</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading catalog...</span>
                  </td>
                </tr>
              ) : isError || !items || items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <ShoppingBag className="h-8 w-8 mx-auto text-slate-350 dark:text-dark-700 mb-2" />
                    <p className="font-semibold text-slate-500 dark:text-dark-400">Catalog is empty</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-light">Add billing items to link them in invoices.</p>
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-900/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-650 dark:text-dark-400">
                      {item.sku}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      {item.description && <div className="text-[10px] text-slate-400 dark:text-dark-500 mt-0.5 truncate max-w-sm">{item.description}</div>}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900 dark:text-white">
                      ₹{item.rate.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="bg-slate-100 text-slate-700 dark:bg-dark-800 dark:text-dark-300 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                        GST {item.gstRate}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-dark-300">
                      Per {item.unit}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 p-1"
                        title="Edit Item details"
                      >
                        <Edit2 className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this SKU?')) {
                            deleteItemMutation.mutate(item._id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete SKU catalog item"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Drawer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-dark-900 border-l border-slate-200 dark:border-dark-800 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="pb-4 border-b border-slate-100 dark:border-dark-800 mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingItem ? 'Edit SKU Catalog' : 'Add New Item SKU'}
                </h2>
                <p className="text-xs text-slate-400 dark:text-dark-500">Provide default pricing details and tax values.</p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form id="add-item-form" onSubmit={handleSaveItem} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    SKU Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="sku"
                    required
                    disabled={!!editingItem} // SKU cannot be edited after creation
                    defaultValue={editingItem?.sku || ''}
                    placeholder="E.g. COR-INC-001"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    required
                    defaultValue={editingItem?.name || ''}
                    placeholder="E.g. Statutory Pvt Ltd Registration Support"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingItem?.description || ''}
                    placeholder="Provide details regarding government filing fees or hourly retainer scopes."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      Rate (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="rate"
                      type="number"
                      required
                      defaultValue={editingItem?.rate || ''}
                      placeholder="15000"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      GST Rate (%)
                    </label>
                    <select
                      name="gstRate"
                      defaultValue={editingItem?.gstRate || 18}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                    >
                      <option value={0}>0% Tax Free</option>
                      <option value={5}>5% GST</option>
                      <option value={12}>12% GST</option>
                      <option value={18}>18% GST (Standard)</option>
                      <option value={28}>28% GST</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-dark-300 uppercase tracking-wider mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      defaultValue={editingItem?.unit || 'Pcs'}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-dark-800 rounded-lg bg-slate-50 dark:bg-dark-950 text-slate-950 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="Pcs">Piece</option>
                      <option value="Box">Box</option>
                      <option value="Hrs">Hour</option>
                      <option value="Days">Day</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex justify-end space-x-3 border-t border-slate-100 dark:border-dark-800 pt-4">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-dark-800 text-slate-700 dark:text-dark-300 font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-item-form"
                disabled={itemMutation.isPending}
                className="btn-tri-45 font-bold py-2 px-4 rounded-xl text-xs shadow-md transition active:scale-95"
              >
                {itemMutation.isPending ? 'Saving...' : 'Save Catalog SKU'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
