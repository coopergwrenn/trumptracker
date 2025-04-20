import React from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center">
              <Newspaper className="h-8 w-8 text-black" />
              <span className="ml-2 text-xl font-bold text-gray-900">Trump Tracker</span>
            </div>
            <p className="mt-4 text-gray-600 max-w-md">
              Stay informed with unbiased, AI-curated news coverage of Donald Trump and his cabinet.
              Our advanced AI technology ensures neutral reporting.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Company</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/about" className="text-gray-600 hover:text-gray-900">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-600 hover:text-gray-900">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-gray-600 hover:text-gray-900">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-4">
              <li>
                <Link to="/privacy" className="text-gray-600 hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-600 hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="https://billing.stripe.com/p/login/dR602z39C7fkfPqcMM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Manage Subscription
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-500">
            © 2025 TrumpTracker.ai. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}