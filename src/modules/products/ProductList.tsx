import { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Database } from 'lucide-react';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import toast from 'react-hot-toast';
import ProductForm from './ProductForm';
import { SEED_PRODUCTS } from '../../data/seedProducts';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleRowClick = (product: Product) => {
    handleEdit(product);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm === id) {
      try {
        await productService.deleteProduct(id);
        toast.success('Product deleted successfully');
        loadProducts();
      } catch (error) {
        toast.error('Failed to delete product');
      }
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await productService.updateProduct(product.id, { is_active: !product.is_active });
      toast.success(`Product ${product.is_active ? 'archived' : 'activated'}`);
      loadProducts();
    } catch (error) {
      toast.error('Failed to update product status');
    }
  };

  const handleFormSubmit = async () => {
    setIsFormOpen(false);
    loadProducts();
  };

  const handleSeedProducts = async () => {
    if (!confirm('This will add default products to your database. Continue?')) return;
    
    setLoading(true);
    try {
      let addedCount = 0;
      for (const product of SEED_PRODUCTS) {
        // Check if product already exists by name to avoid duplicates
        const exists = products.some(p => p.name === product.name);
        if (!exists) {
          await productService.createProduct(product);
          addedCount++;
        }
      }
      
      if (addedCount > 0) {
        toast.success(`Added ${addedCount} new products`);
        loadProducts();
      } else {
        toast('All products already exist', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Error seeding products:', error);
      toast.error('Failed to seed products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Products & Services</h1>
                <div className="flex gap-2">
          <button
            onClick={handleSeedProducts}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            title="Import Default Products"
          >
            <Database className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">Import Defaults</span>
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search products..."
          className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          Click any product row to quick-edit pricing and details.
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Product
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Cost
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Direct Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                PV Price
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 dark:bg-gray-800 divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr
                key={product.id}
                onClick={() => handleRowClick(product)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleRowClick(product);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`${!product.is_active ? 'bg-gray-50 dark:bg-gray-700 dark:bg-gray-700' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{product.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate max-w-xs">{product.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white dark:text-white">{product.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">{formatCurrency(product.cost)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white dark:text-white font-medium">{formatCurrency(product.price_direct)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white dark:text-white font-medium">{formatCurrency(product.price_pv)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleActive(product);
                    }}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.is_active ? 'Active' : 'Archived'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEdit(product);
                      }}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(product.id);
                      }}
                      className={`inline-flex items-center px-2.5 py-1.5 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        deleteConfirm === product.id 
                          ? 'border-transparent text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                          : 'border-gray-300 text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:ring-red-500'
                      }`}
                    >
                      {deleteConfirm === product.id ? (
                        'Confirm?'
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </>
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
