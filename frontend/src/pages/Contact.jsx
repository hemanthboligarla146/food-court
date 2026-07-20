import { useState } from 'react';
import api from '../api/axios';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      // In a real app, this would hit an endpoint
      // We will just log analytics event
      await api.post('analytics/contact_form/', formData).catch(() => {});
      setStatus('success');
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Contact Us</h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Have questions about our menu, delivery areas, or just want to say hi? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Form */}
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input required type="text" className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input required type="email" className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea required rows={5} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              </div>
              
              {status === 'success' && <p className="text-green-600 font-medium">Message sent successfully!</p>}
              {status === 'error' && <p className="text-red-600 font-medium">Failed to send message. Try again.</p>}
              
              <button type="submit" disabled={status === 'sending'} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none transition-colors">
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          
          {/* Info & Map Placeholder */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Business Information</h3>
              <p className="text-gray-600 flex items-center gap-3 mb-2">📍 123 Food Street, Culinary City, CA 90210</p>
              <p className="text-gray-600 flex items-center gap-3 mb-2">📞 +1 (555) 123-4567</p>
              <p className="text-gray-600 flex items-center gap-3">✉️ support@foodcourt.com</p>
            </div>
            
            <div className="bg-gray-200 h-64 rounded-2xl flex items-center justify-center border border-gray-300 overflow-hidden">
               <span className="text-gray-500 font-medium">Google Map Placeholder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
