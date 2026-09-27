import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldAlert,
  Download,
  Trash2,
  CheckCircle2,
  EyeOff,
  RotateCcw,
  UserCheck,
  Camera,
} from 'lucide-react';
import { ModerationReport, PostItem, UserProfile } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { MediaImage } from './MediaImage.tsx';
import { AvatarPickerPanel, UserAvatar } from './UserAvatar.tsx';

interface ProfileAndModerationSectionProps {
  inspectedUid: string | null;
  onOpenPost: (post: PostItem) => void;
  onRefreshGallery: () => Promise<void>;
}

export const ProfileAndModerationSection: React.FC<ProfileAndModerationSectionProps> = ({
  inspectedUid,
  onOpenPost,
  onRefreshGallery,
}) => {
  const { firebaseUser, profile, signInWithGoogle, logout, authFetch, refreshProfile } =
    useAuth();

  const targetUid = inspectedUid || profile?.uid || null;
  const isOwnProfile = Boolean(profile && targetUid === profile.uid);

  const [viewedUser, setViewedUser] = useState<UserProfile | null>(null);
  const [uploadedPosts, setUploadedPosts] = useState<PostItem[]>([]);
  const [likedPosts, setLikedPosts] = useState<PostItem[]>([]);
  const [activeTab, setActiveTab] = useState<'uploaded' | 'liked' | 'moderation' | 'gdpr'>(
    'uploaded'
  );
  const [loadingData, setLoadingData] = useState(false);

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null);
  const [savingBio, setSavingBio] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadUserActivity = useCallback(async () => {
    if (!targetUid) return;
    setLoadingData(true);
    try {
      const res = await authFetch(`/api/users/${encodeURIComponent(targetUid)}/profile`);
      if (res.ok) {
        const data = await res.json();
        setViewedUser(data.user);
        setUploadedPosts(data.uploadedPosts || []);
        setLikedPosts(data.likedPosts || []);
        if (data.user) {
          setEditName(data.user.displayName || '');
          setEditBio(data.user.bio || '');
          setEditAvatarUrl(data.user.avatarUrl || null);
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setLoadingData(false);
    }
  }, [targetUid, authFetch]);

  const loadReports = useCallback(async () => {
    if (!firebaseUser) return;
    setLoadingReports(true);
    try {
      const res = await authFetch('/api/moderation/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error loading moderation reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [firebaseUser, authFetch]);

  useEffect(() => {
    loadUserActivity();
  }, [loadUserActivity]);

  useEffect(() => {
    if (activeTab === 'moderation') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBio(true);
    setStatusBanner(null);
    try {
      const res = await authFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: editName,
          bio: editBio,
          avatarUrl: editAvatarUrl,
        }),
      });
      if (res.ok) {
        await refreshProfile();
        await loadUserActivity();
        await onRefreshGallery();
        setStatusBanner('Field Naturalist profile and avatar updated across the archive.');
      }
    } finally {
      setSavingBio(false);
    }
  };

  const handleInstantAvatarSelect = async (newAvatarUrl: string) => {
    setEditAvatarUrl(newAvatarUrl);
    setSavingBio(true);
    setStatusBanner(null);
    try {
      const res = await authFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: newAvatarUrl }),
      });
      if (res.ok) {
        await refreshProfile();
        await loadUserActivity();
        await onRefreshGallery();
        setStatusBanner('Avatar emblem saved and synced to your posts and comments.');
      }
    } finally {
      setSavingBio(false);
    }
  };

  const handleResolveReport = async (
    reportId: number,
    action: 'dismiss' | 'hide_target' | 'restore_target'
  ) => {
    try {
      const res = await authFetch(`/api/moderation/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await loadReports();
        await onRefreshGallery();
      }
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  const handleExportGdpr = async () => {
    const res = await authFetch('/api/users/me/export');
    if (res.ok) {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terra-gdpr-archive-${profile?.uid || 'user'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteAccountGdpr = async () => {
    const res = await authFetch('/api/users/me', { method: 'DELETE' });
    if (res.ok) {
      await logout();
      await onRefreshGallery();
    }
  };

  if (!targetUid) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-8 py-20 text-center space-y-6">
        <div className="text-xs uppercase tracking-widest text-[#57534E]">
          Field Naturalist Credentials Required
        </div>
        <h1 className="font-editorial text-4xl font-medium text-[#1C1917]">
          Sign in to access your Field Dossier, Avatar Studio &amp; Moderation Desk
        </h1>
        <p className="text-sm text-[#44403C] max-w-lg mx-auto leading-relaxed">
          Authenticate with Google to customize your nature-themed avatar, upload geotagged
          observations, curate your endorsed archive, and manage GDPR data portability.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="px-6 py-3 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium hover:bg-[#142C20] transition-colors"
        >
          Continue with Google Sign-In
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      {/* Profile Header with 96x96 User Avatar */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#EBE6DF] border border-[#D6CEBE] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative self-start">
            <UserAvatar
              src={viewedUser?.avatarUrl}
              name={viewedUser?.displayName || 'Field Naturalist'}
              size="xl"
            />
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setActiveTab('gdpr')}
                title="Change Avatar"
                className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#1B3B2B] text-[#F7F4EE] border-2 border-[#EBE6DF] hover:bg-[#C85A32] transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
              <span>Field Naturalist Archive</span>
              <span aria-hidden="true">·</span>
              <span>
                Role: {viewedUser?.role === 'admin' ? 'Curator & Moderator' : 'Contributor'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {uploadedPosts.length} Uploaded · {likedPosts.length} Endorsed
              </span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917]">
              {viewedUser?.displayName || 'Field Naturalist'}
            </h1>
            <p className="text-sm text-[#44403C] max-w-2xl leading-relaxed">
              {viewedUser?.bio ||
                'Documenting global biodiversity, regional habitats, and citizen conservation records on Terra.'}
            </p>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F4EE] rounded-lg border border-[#D6CEBE]">
          <button
            type="button"
            onClick={() => setActiveTab('uploaded')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'uploaded'
                ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                : 'text-[#44403C] hover:text-[#1C1917]'
            }`}
          >
            Uploaded ({uploadedPosts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('liked')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'liked'
                ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                : 'text-[#44403C] hover:text-[#1C1917]'
            }`}
          >
            Endorsed / Liked ({likedPosts.length})
          </button>
          {isOwnProfile && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('gdpr')}
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'gdpr'
                    ? 'bg-[#1B3B2B] text-[#F7F4EE]'
                    : 'text-[#44403C] hover:text-[#1C1917]'
                }`}
              >
                Avatar &amp; Profile
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('moderation')}
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'moderation'
                    ? 'bg-[#C85A32] text-[#F7F4EE]'
                    : 'text-[#44403C] hover:text-[#1C1917]'
                }`}
              >
                Moderation Desk
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {loadingData ? (
        <div className="py-12 text-center text-sm text-[#57534E]">
          Loading naturalist dossier...
        </div>
      ) : activeTab === 'uploaded' || activeTab === 'liked' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'uploaded' ? uploadedPosts : likedPosts).length === 0 ? (
            <div className="col-span-full py-14 text-center border border-[#D6CEBE] rounded-xl bg-[#EBE6DF]/40">
              <p className="font-editorial text-2xl text-[#1C1917]">
                {activeTab === 'uploaded'
                  ? 'No field observations uploaded yet'
                  : 'No observations endorsed yet'}
              </p>
              <p className="mt-1 text-xs text-[#57534E]">
                Explore the public gallery or click &ldquo;Log Observation&rdquo; in the top
                bar to contribute.
              </p>
            </div>
          ) : (
            (activeTab === 'uploaded' ? uploadedPosts : likedPosts).map((post) => (
              <article
                key={post.id}
                onClick={() =>
                  onOpenPost({
                    ...post,
                    comments: post.comments || [],
                    likeCount: post.likeCount ?? 0,
                    likedByMe: true,
                    commentCount: post.commentCount ?? 0,
                  })
                }
                className="group cursor-pointer bg-[#EBE6DF]/50 border border-[#D6CEBE] rounded-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] w-full overflow-hidden bg-[#1C1917]">
                    <MediaImage
                      src={post.mediaUrl}
                      alt={post.title}
                      mediaType={post.mediaType}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
                      <span>{post.continent}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.country}</span>
                      <span aria-hidden="true">·</span>
                      <span>{post.category}</span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold text-[#1C1917] group-hover:text-[#C85A32] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#44403C] line-clamp-2">{post.description}</p>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-[#D6CEBE] bg-[#E6E1D6]/50 flex items-center justify-between text-xs text-[#57534E]">
                  <div className="flex items-center gap-2 truncate">
                    <UserAvatar
                      src={post.authorAvatar}
                      name={post.authorName}
                      size="xs"
                    />
                    <span className="font-medium text-[#1C1917] truncate">
                      {post.authorName}
                    </span>
                  </div>
                  <span className="font-mono-tabular text-[11px]">{post.locationName}</span>
                </div>
              </article>
            ))
          )}
        </div>
      ) : activeTab === 'moderation' ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D6CEBE] pb-4">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Curatorial Moderation &amp; Community Reports
              </h2>
              <p className="text-xs text-[#57534E]">
                Review flagged posts and comments for accuracy, wildlife ethics compliance,
                and community standards.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#1B3B2B]">
              <ShieldAlert className="w-4 h-4 text-[#C85A32]" />
              <span className="font-mono-tabular">{reports.length} Total Reports</span>
            </div>
          </div>

          {loadingReports ? (
            <div className="py-10 text-center text-sm text-[#57534E]">
              Loading moderation queue...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center border border-[#D6CEBE] rounded-xl bg-[#EBE6DF]/40">
              <CheckCircle2 className="w-6 h-6 text-[#1B3B2B] mx-auto mb-2" />
              <p className="font-editorial text-2xl text-[#1C1917]">
                All community flags have been reviewed
              </p>
              <p className="text-xs text-[#57534E] mt-1">
                Flag any post or comment from the gallery lightbox to test the moderation
                pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-xl bg-[#EBE6DF]/65 border border-[#D6CEBE] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                      <span className="font-semibold text-[#9A3412] uppercase">
                        {rep.targetType} #{rep.targetId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Status: {rep.status}</span>
                      <span aria-hidden="true">·</span>
                      <span>Target Visibility: {rep.targetStatus}</span>
                      <span aria-hidden="true">·</span>
                      <span>Flagged by {rep.reporterName}</span>
                    </div>
                    <h3 className="font-editorial text-xl font-semibold text-[#1C1917]">
                      {rep.targetSummary}
                    </h3>
                    <p className="text-xs text-[#292524]">
                      <span className="font-medium">Reason:</span> {rep.reason}
                      {rep.details ? ` — "${rep.details}"` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id, 'hide_target')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9A3412] text-[#F7F4EE] text-xs font-medium hover:bg-[#7C2D12] transition-colors whitespace-nowrap"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide Content</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id, 'restore_target')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium hover:bg-[#142C20] transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(rep.id, 'dismiss')}
                      className="px-3 py-1.5 rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-xs font-medium text-[#44403C] hover:text-[#1C1917] whitespace-nowrap"
                    >
                      Dismiss Flag
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Avatar Studio, Profile Edit & GDPR Compliance Section */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {statusBanner && (
              <div className="p-3.5 rounded-xl bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#C85A32] shrink-0" />
                <span>{statusBanner}</span>
              </div>
            )}

            {/* Avatar Picker Card */}
            <div className="p-6 rounded-xl bg-[#EBE6DF]/60 border border-[#D6CEBE] space-y-4">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Naturalist Avatar Studio
              </h2>
              <AvatarPickerPanel
                currentAvatarUrl={editAvatarUrl}
                displayName={editName || viewedUser?.displayName || 'Field Naturalist'}
                onSelectAvatar={handleInstantAvatarSelect}
                saving={savingBio}
              />
            </div>

            {/* Bio & Display Name Form */}
            <form
              onSubmit={handleSaveProfile}
              className="p-6 rounded-xl bg-[#EBE6DF]/60 border border-[#D6CEBE] space-y-4"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#57534E] font-semibold">
                <UserCheck className="w-4 h-4 text-[#1B3B2B]" />
                <span>Field Naturalist Credentials</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Ecological Discipline &amp; Biography
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="e.g., Canopy ecologist documenting temperate rainforest bryophytes..."
                  className="w-full px-3.5 py-2 rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingBio}
                className="px-4 py-2 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium hover:bg-[#142C20] transition-colors"
              >
                {savingBio ? 'Saving...' : 'Save Naturalist Profile'}
              </button>
            </form>
          </div>

          {/* GDPR Data Sovereignty Panel */}
          <div className="lg:col-span-5 p-6 rounded-xl bg-[#EBE6DF]/60 border border-[#D6CEBE] space-y-4 h-fit">
            <h3 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              GDPR Data Sovereignty &amp; Privacy
            </h3>
            <p className="text-xs text-[#44403C] leading-relaxed">
              In compliance with GDPR Articles 15, 17, and 20, Terra stores only essential
              authentication identifiers, your chosen avatar, and geotagged observations you
              explicitly publish. You may export your complete relational archive in
              machine-readable JSON or permanently erase your account and associated records.
            </p>
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleExportGdpr}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-xs font-medium text-[#1C1917] hover:bg-[#E6E1D6] transition-colors"
              >
                <Download className="w-4 h-4 text-[#1B3B2B]" />
                <span>Download Complete GDPR Data Archive (JSON)</span>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#9A3412]/10 border border-[#9A3412]/40 text-xs font-medium text-[#9A3412] hover:bg-[#9A3412] hover:text-[#F7F4EE] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Erase Account &amp; All Personal Data (Art. 17)</span>
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-[#9A3412]/10 border border-[#9A3412] space-y-2">
                  <p className="text-xs text-[#9A3412] font-medium">
                    Confirm permanent erasure of your profile, posts, likes, and comments?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccountGdpr}
                      className="px-3 py-1.5 rounded-md bg-[#9A3412] text-[#F7F4EE] text-xs font-medium"
                    >
                      Confirm Permanent Erasure
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-md bg-[#F7F4EE] text-[#1C1917] text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
