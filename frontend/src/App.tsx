import ProductManagement from './components/ProductManagement';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">商品管理システム</h1>
        </div>
      </header>
      <main>
        <ProductManagement />
      </main>
    </div>
  )
}

export default App
