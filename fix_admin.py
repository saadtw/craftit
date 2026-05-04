import re

with open('app/admin/profile/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Resolving conflict
# Use Fasiha's UI, adding logic for hasLocalPassword

merged_ui = '''        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Info */}
            <section className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" />
                    <h2 className="font-bold text-[10px] text-white uppercase tracking-[0.2em]">Account Identity</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] bg-gradient-to-br from-purple-500/20 to-transparent">
                    <span className="text-white text-2xl font-black uppercase">
                      {session?.user?.name?.[0]?.toUpperCase() || "A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg tracking-tight">
                      {session?.user?.name || "System Admin"}
                    </p>
                    <p className="text-slate-400 text-xs font-medium mt-0.5">{session?.user?.email}</p>
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-black tracking-widest uppercase rounded-md">
                        System Admin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Note */}
            <section className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <h2 className="font-bold text-[10px] text-white uppercase tracking-[0.2em]">Security Protocol</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <FiShield className="text-emerald-400 w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold tracking-wide">
                      Two-Factor Auth
                    </p>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                      2FA enforcement is strictly configured at the infrastructure level for all active administrative accounts.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Change Password */}
          <section className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                  <h2 className="font-bold text-[10px] text-white uppercase tracking-[0.2em]">
                    {hasLocalPassword ? "Credentials Update" : "Set Credentials"}
                  </h2>
              </div>
              <FiLock className="text-slate-500 w-3 h-3" />
            </div>
            
            <div className="p-6 md:p-8">
              <form onSubmit={handleChangePassword} className="space-y-5">
                {hasLocalPassword && (
                  <div>
                    <label className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder="••••••••"
                      className="w-full bg-white/[0.02] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium tracking-wide placeholder-slate-600 hover:border-purple-400/50 hover:bg-white/[0.04] focus:border-purple-500 focus:bg-white/[0.06] focus:outline-none transition-all"
                      required
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-2">
                      {hasLocalPassword ? "New Password" : "Password"}
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="••••••••"
                      className="w-full bg-white/[0.02] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium tracking-wide placeholder-slate-600 hover:border-purple-400/50 hover:bg-white/[0.04] focus:border-purple-500 focus:bg-white/[0.06] focus:outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-2">
                      Confirm {hasLocalPassword ? "New " : ""}Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="••••••••"
                      className="w-full bg-white/[0.02] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium tracking-wide placeholder-slate-600 hover:border-purple-400/50 hover:bg-white/[0.04] focus:border-purple-500 focus:bg-white/[0.06] focus:outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {pwError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{pwError}</p>
                  </div>
                )}
                {pwSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{pwSuccess}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-[10px] font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)]"
                  >
                    {pwLoading ? "Updating..." : (hasLocalPassword ? "Update Password" : "Set Password")}
                  </button>
                </div>
              </form>
            </div>
          </section>

        </div>'''

new_content = re.sub(r'<<<<<<< HEAD.*?=======(.*?)>>>>>>> origin/FasihaUiBranch', '', content, flags=re.DOTALL)
# Wait, this regex would remove everything. Let's just find the start of HEAD and end of origin and replace it.

start_idx = content.find('<<<<<<< HEAD')
end_idx = content.find('>>>>>>> origin/FasihaUiBranch') + len('>>>>>>> origin/FasihaUiBranch')

if start_idx != -1 and end_idx != -1:
    final_content = content[:start_idx] + merged_ui + content[end_idx:]
    with open('app/admin/profile/page.js', 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("Resolved app/admin/profile/page.js")
else:
    print("Could not find markers in app/admin/profile/page.js")
