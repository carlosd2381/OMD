import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, ChevronDown, ChevronRight, Circle, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settingsService';

interface ChildCategory {
  id: string;
  name: string;
  isActive: boolean;
}

interface ParentCategory {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  children: ChildCategory[];
}

const INITIAL_DATA: ParentCategory[] = [
  {
    id: '1',
    name: 'Cost of Goods Sold (COGS)',
    color: '#EF4444', // Red
    isActive: true,
    children: [
      { id: '1-1', name: 'Ingredients - Dry Goods', isActive: true },
      { id: '1-2', name: 'Ingredients - Perishables', isActive: true },
      { id: '1-3', name: 'Ingredients - Specialty', isActive: true },
      { id: '1-4', name: 'Packaging & Presentation', isActive: true },
      { id: '1-5', name: 'Event Disposables', isActive: true },
    ]
  },
  {
    id: '2',
    name: 'Kitchen & Facilities',
    color: '#F97316', // Orange
    isActive: true,
    children: [
      { id: '2-1', name: 'Rent/Lease', isActive: true },
      { id: '2-2', name: 'Utilities', isActive: true },
      { id: '2-3', name: 'Cleaning & Sanitation', isActive: true },
      { id: '2-4', name: 'Kitchen Supplies', isActive: true },
    ]
  },
  {
    id: '3',
    name: 'Labor & Staffing',
    color: '#EAB308', // Yellow
    isActive: true,
    children: [
      { id: '3-1', name: 'Kitchen Staff', isActive: true },
      { id: '3-2', name: 'Event Staff', isActive: true },
      { id: '3-3', name: 'Administrative Staff', isActive: true },
      { id: '3-4', name: 'Payroll Taxes', isActive: true },
      { id: '3-5', name: 'Worker’s Compensation', isActive: true },
    ]
  },
  {
    id: '4',
    name: 'Equipment & Smallwares',
    color: '#22C55E', // Green
    isActive: true,
    children: [
      { id: '4-1', name: 'Large Equipment', isActive: true },
      { id: '4-2', name: 'Smallwares', isActive: true },
      { id: '4-3', name: 'Display Equipment', isActive: true },
      { id: '4-4', name: 'Equipment Maintenance', isActive: true },
    ]
  },
  {
    id: '5',
    name: 'Delivery & Logistics',
    color: '#06B6D4', // Cyan
    isActive: true,
    children: [
      { id: '5-1', name: 'Vehicle Expenses', isActive: true },
      { id: '5-2', name: 'Vehicle Maintenance', isActive: true },
      { id: '5-3', name: 'Transport Supplies', isActive: true },
      { id: '5-4', name: 'Delivery Insurance', isActive: true },
    ]
  },
  {
    id: '6',
    name: 'Marketing & Client Acquisition',
    color: '#3B82F6', // Blue
    isActive: true,
    children: [
      { id: '6-1', name: 'Digital Advertising', isActive: true },
      { id: '6-2', name: 'Website & Software', isActive: true },
      { id: '6-3', name: 'Tastings', isActive: true },
      { id: '6-4', name: 'Print Materials', isActive: true },
      { id: '6-5', name: 'Photo/Video', isActive: true },
    ]
  },
  {
    id: '7',
    name: 'Administrative & Professional',
    color: '#8B5CF6', // Purple
    isActive: true,
    children: [
      { id: '7-1', name: 'Licensing & Permits', isActive: true },
      { id: '7-2', name: 'Insurance', isActive: true },
      { id: '7-3', name: 'Professional Fees', isActive: true },
      { id: '7-4', name: 'Bank & Processing Fees', isActive: true },
      { id: '7-5', name: 'Office Supplies', isActive: true },
    ]
  },
  {
    id: '8',
    name: 'Taxes',
    color: '#64748B', // Slate
    isActive: true,
    children: [
      { id: '8-1', name: 'Sales Tax Remittance', isActive: true },
      { id: '8-2', name: 'Income Tax', isActive: true },
    ]
  }
];

export default function ExpenseCategorySettings() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<ParentCategory[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalColor, setModalColor] = useState('#000000');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await settingsService.getExpenseCategories();
      if (data.length === 0) {
          // Seed defaults if empty
          // We'll just show them in UI for now, and let user save them individually? 
          // Or better, just set them as state and let user interact.
          // But if we want them to persist, we should probably create them.
          // For now, let's just set them in state. If user edits, we might have issues with IDs.
          // So let's create them in DB.
          await seedDefaults();
          return; // seedDefaults calls loadCategories again
      }

      const mapped: ParentCategory[] = data.map(item => ({
        id: item.id,
        name: item.name,
        color: item.color || '#000000',
        isActive: item.is_active !== false,
        children: ((item as any).children as any[]) || []
      }));
      setCategories(mapped);
      setExpandedIds(new Set(mapped.map(c => c.id)));
    } catch (error) {
      console.error('Error loading expense categories:', error);
      toast.error('Failed to load expense categories');
    } finally {
      setLoading(false);
    }
  };

  const seedDefaults = async () => {
      try {
          for (const cat of INITIAL_DATA) {
              await settingsService.createExpenseCategory({
                  name: cat.name,
                  color: cat.color,
                  is_active: cat.isActive,
                  children: cat.children
              } as any);
          }
          await loadCategories();
      } catch (error) {
          console.error('Error seeding defaults:', error);
      }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAddParent = () => {
    setEditingParentId(null);
    setEditingChildId(null);
    setModalName('');
    setModalColor('#3B82F6');
    setIsModalOpen(true);
  };

  const handleAddChild = (parentId: string) => {
    setEditingParentId(parentId);
    setEditingChildId(null);
    setModalName('');
    setIsModalOpen(true);
  };

  const handleEditParent = (category: ParentCategory) => {
    setEditingParentId(category.id);
    setEditingChildId('PARENT_EDIT_MODE'); // Special flag to distinguish from adding child
    setModalName(category.name);
    setModalColor(category.color);
    setIsModalOpen(true);
  };

  const handleEditChild = (parentId: string, child: ChildCategory) => {
    setEditingParentId(parentId);
    setEditingChildId(child.id);
    setModalName(child.name);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!modalName.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
        if (editingParentId === null) {
            // Add New Parent
            await settingsService.createExpenseCategory({
                name: modalName,
                color: modalColor,
                is_active: true,
                children: []
            } as any);
            toast.success('Category added');
        } else if (editingChildId === 'PARENT_EDIT_MODE') {
            // Edit Parent
            await settingsService.updateExpenseCategory(editingParentId, {
                name: modalName,
                color: modalColor
            } as any);
            toast.success('Category updated');
        } else if (editingChildId === null) {
            // Add New Child
            const parent = categories.find(c => c.id === editingParentId);
            if (parent) {
                const newChild: ChildCategory = {
                    id: Date.now().toString(),
                    name: modalName,
                    isActive: true
                };
                const updatedChildren = [...parent.children, newChild];
                await settingsService.updateExpenseCategory(editingParentId, {
                    children: updatedChildren
                } as any);
                toast.success('Sub-category added');
            }
        } else {
            // Edit Child
            const parent = categories.find(c => c.id === editingParentId);
            if (parent) {
                const updatedChildren = parent.children.map(child => 
                    child.id === editingChildId 
                        ? { ...child, name: modalName } 
                        : child
                );
                await settingsService.updateExpenseCategory(editingParentId, {
                    children: updatedChildren
                } as any);
                toast.success('Sub-category updated');
            }
        }
        await loadCategories();
        setIsModalOpen(false);
    } catch (error) {
        console.error('Error saving category:', error);
        toast.error('Failed to save category');
    }
  };

  const toggleParentStatus = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;
    try {
        await settingsService.updateExpenseCategory(id, { is_active: !category.isActive });
        await loadCategories();
        toast.success(`Category ${!category.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
        console.error('Error updating category status:', error);
        toast.error('Failed to update status');
    }
  };

  const toggleChildStatus = async (parentId: string, childId: string) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return;
    
    try {
        const updatedChildren = parent.children.map(child => 
            child.id === childId ? { ...child, isActive: !child.isActive } : child
        );
        await settingsService.updateExpenseCategory(parentId, { children: updatedChildren } as any);
        await loadCategories();
        toast.success('Sub-category status updated');
    } catch (error) {
        console.error('Error updating sub-category status:', error);
        toast.error('Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-500" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Categories</h2>
            <p className="text-sm text-gray-500">Manage your chart of accounts for expense tracking.</p>
          </div>
        </div>
        <button
          onClick={handleAddParent}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {loading && categories.length === 0 ? (
          <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-pink-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-500">Loading categories...</p>
          </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
            {categories.map((parent) => (
                <li key={parent.id} className={`bg-white ${!parent.isActive ? 'opacity-60' : ''}`}>
                <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                        <button 
                        onClick={() => toggleExpand(parent.id)}
                        className="mr-2 text-gray-400 hover:text-gray-600"
                        >
                        {expandedIds.has(parent.id) ? (
                            <ChevronDown className="h-5 w-5" />
                        ) : (
                            <ChevronRight className="h-5 w-5" />
                        )}
                        </button>
                        <div 
                        className="h-4 w-4 rounded-full mr-3 shrink-0" 
                        style={{ backgroundColor: parent.color }}
                        />
                        <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-900 truncate flex items-center">
                            {parent.name}
                            {!parent.isActive && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Inactive
                            </span>
                            )}
                        </p>
                        <p className="text-xs text-gray-500">
                            {parent.children.length} sub-categories
                        </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                        onClick={() => handleAddChild(parent.id)}
                        className="p-1 text-gray-400 hover:text-pink-600"
                        title="Add Sub-category"
                        >
                        <Plus className="h-5 w-5" />
                        </button>
                        <button
                        onClick={() => handleEditParent(parent)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Edit Category"
                        >
                        <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                        onClick={() => toggleParentStatus(parent.id)}
                        className={`p-1 ${parent.isActive ? 'text-green-500 hover:text-red-500' : 'text-gray-300 hover:text-green-500'}`}
                        title={parent.isActive ? "Deactivate" : "Activate"}
                        >
                        {parent.isActive ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </button>
                    </div>
                    </div>
                    
                    {expandedIds.has(parent.id) && (
                    <div className="mt-4 ml-11 space-y-2 border-l-2 border-gray-100 pl-4">
                        {parent.children.map((child) => (
                        <div key={child.id} className={`flex items-center justify-between group ${!child.isActive ? 'opacity-50' : ''}`}>
                            <div className="flex items-center text-sm text-gray-600">
                            <Circle className="h-2 w-2 mr-3 text-gray-300 fill-current" />
                            <span className={!child.isActive ? 'line-through' : ''}>{child.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEditChild(parent.id, child)}
                                className="text-xs text-indigo-600 hover:text-indigo-900"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => toggleChildStatus(parent.id, child.id)}
                                className={`text-xs ${child.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            >
                                {child.isActive ? 'Disable' : 'Enable'}
                            </button>
                            </div>
                        </div>
                        ))}
                        {parent.children.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No sub-categories yet.</p>
                        )}
                    </div>
                    )}
                </div>
                </li>
            ))}
            </ul>
        </div>
      )}

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingParentId === null ? 'Add Category' : 
               editingChildId === 'PARENT_EDIT_MODE' ? 'Edit Category' :
               editingChildId === null ? 'Add Sub-category' : 'Edit Sub-category'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  autoFocus
                />
              </div>

              {(editingParentId === null || editingChildId === 'PARENT_EDIT_MODE') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Color Code</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <input
                      type="color"
                      value={modalColor}
                      onChange={(e) => setModalColor(e.target.value)}
                      className="h-8 w-8 border border-gray-300 rounded-md p-0 overflow-hidden"
                    />
                    <input
                      type="text"
                      value={modalColor}
                      onChange={(e) => setModalColor(e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
