import { Settings as SettingsIcon, Info } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold font-display text-gray-900">Settings</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">System Configuration</h2>
            <p className="text-sm text-gray-500">Manage system-level settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Environment Configuration</p>
                <p className="text-sm text-blue-700 mt-1">
                  System settings like Supabase connection, Zoom API credentials, and CORS configuration
                  are managed via environment variables in the backend <code className="bg-blue-100 px-1 rounded">.env</code> file.
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Backend Environment Variables</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">SUPABASE_URL</span>
                <span className="text-gray-400">Supabase project URL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</span>
                <span className="text-gray-400">Service role key</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">ZOOM_CLIENT_ID</span>
                <span className="text-gray-400">Zoom OAuth client ID</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">ZOOM_CLIENT_SECRET</span>
                <span className="text-gray-400">Zoom OAuth client secret</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">ZOOM_ACCOUNT_ID</span>
                <span className="text-gray-400">Zoom account ID</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Frontend Environment Variables</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">VITE_SUPABASE_PROJECT_URL</span>
                <span className="text-gray-400">Supabase URL (public)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</span>
                <span className="text-gray-400">Anon key (public)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">VITE_API_URL</span>
                <span className="text-gray-400">Backend API URL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
