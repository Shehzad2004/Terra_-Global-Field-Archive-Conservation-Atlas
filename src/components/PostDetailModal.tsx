import React, { useState } from 'react';
import {
  X,
  Heart,
  MessageSquare,
  Flag,
  MapPin,
  Camera,
  CornerDownRight,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { CommentItem, PostItem } from '../types.ts';
import { MediaImage } from './MediaImage.tsx';
import { UserAvatar } from './UserAvatar.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface PostDetailModalProps {
  post: PostItem;
  onClose: () => void;
  onToggleLike: (postId: number) => Promise<void>;
  onAddComment: (postId: number, content: string, parentId?: number | null) => Promise<void>;
  onReport: (targetType: 'post' | 'comment', targetId: number, reason: string, details: string) => Promise<void>;
  onSelectAuthor: (uid: string) => void;
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  onClose,
  onToggleLike,
  onAddComment,
  onReport,
  onSelectAuthor,
}) => {
  const { firebaseUser, signInWithGoogle } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<{
    type: 'post' | 'comment';
    id: number;
    label: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('Inaccurate location or species ID');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const topLevelComments = (post.comments || []).filter((c) => !c.parentId);
  const getReplies = (parentId: number) =>
    (post.comments || []).filter((c) => c.parentId === parentId);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    setCommentError(null);
    try {
      await onAddComment(post.id, commentText.trim(), replyTo ? replyTo.id : null);
      setCommentText('');
      setReplyTo(null);
    } catch (err: any) {
      setCommentError(err?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget) return;
    if (!firebaseUser) {
      await signInWithGoogle();
      return;
    }
    try {
      await onReport(reportTarget.type, reportTarget.id, reportReason, reportDetails);
      setReportSubmitted(true);
      setTimeout(() => {
        setReportSubmitted(false);
        setReportTarget(null);
        setReportDetails('');
      }, 1500);
    } catch (err) {
      console.error('Report error:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-6xl bg-[#F7F4EE] border border-[#D6CEBE] rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]">
        {/* Left Column: High-Resolution Media & Accession Metadata */}
        <div className="lg:col-span-7 bg-[#141210] flex flex-col justify-between overflow-y-auto">
          <div className="relative w-full min-h-[300px] sm:min-h-[420px] flex items-center justify-center bg-[#0D0C0A]">
            <MediaImage
              src={post.mediaUrl}
              alt={post.title}
              mediaType={post.mediaType}
              className="w-full max-h-[62vh] object-contain"
              subtitle={`${post.locationName} · ${post.country}`}
            />
          </div>

          <div className="p-6 bg-[#1C1917] text-[#F7F4EE] border-t border-[#2E2925]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#D6CEBE]/80 mb-2">
              <span>{post.continent}</span>
              <span aria-hidden="true">·</span>
              <span>{post.country}</span>
              <span aria-hidden="true">·</span>
              <span>{post.category}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                {post.latitude.toFixed(4)}° N, {post.longitude.toFixed(4)}° E
              </span>
            </div>

            <h2 className="font-editorial text-2xl sm:text-3xl font-medium text-[#F7F4EE] leading-snug">
              {post.title}
            </h2>

            <p className="mt-3 text-sm text-[#D6CEBE] leading-relaxed">
              {post.description}
            </p>

            <div className="mt-5 pt-4 border-t border-[#2E2925] flex flex-wrap items-center justify-between gap-4 text-xs text-[#A8A29E]">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>{post.locationName}</span>
              </div>
              {post.cameraExif && (
                <div className="flex items-center gap-2 font-mono-tabular">
                  <Camera className="w-3.5 h-3.5 text-[#D6CEBE]/70" />
                  <span>{post.cameraExif}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Field Naturalist Dossier, Likes & Threaded Comments */}
        <div className="lg:col-span-5 flex flex-col h-full max-h-[92vh] bg-[#F7F4EE]">
          {/* Header Bar */}
          <div className="p-5 border-b border-[#D6CEBE] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectAuthor(post.userUid);
              }}
              className="flex items-center gap-3 text-left group"
            >
              <UserAvatar
                src={post.authorAvatar}
                name={post.authorName}
                size="md"
              />
              <div>
                <div className="text-xs text-[#57534E]">Recorded by Field Naturalist</div>
                <div className="text-sm font-semibold text-[#1C1917] group-hover:text-[#C85A32] transition-colors">
                  {post.authorName}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleLike(post.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  post.likedByMe
                    ? 'bg-[#C85A32] text-[#F7F4EE]'
                    : 'bg-[#EBE6DF] text-[#1C1917] hover:bg-[#DFD8CE]'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-current' : ''}`}
                />
                <span className="font-mono-tabular">{post.likeCount}</span>
                <span>{post.likedByMe ? 'Endorsed' : 'Endorse'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setReportTarget({
                    type: 'post',
                    id: post.id,
                    label: `Observation "${post.title}"`,
                  })
                }
                title="Report Observation"
                className="p-2 rounded-lg text-[#57534E] hover:text-[#9A3412] hover:bg-[#EBE6DF] transition-colors"
              >
                <Flag className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-lg text-[#1C1917] hover:bg-[#EBE6DF] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Inline Report Drawer if active */}
          {reportTarget && (
            <form
              onSubmit={handleReportSubmit}
              className="p-4 bg-[#EBE6DF] border-b border-[#D6CEBE] text-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#9A3412]">
                  Flagging for Curatorial Review: {reportTarget.label}
                </span>
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="text-[#57534E] hover:text-[#1C1917]"
                >
                  Cancel
                </button>
              </div>
              {reportSubmitted ? (
                <div className="flex items-center gap-2 text-[#1B3B2B] font-medium py-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Report logged for curatorial moderation.</span>
                </div>
              ) : (
                <>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-[#F7F4EE] border border-[#D6CEBE] text-[#1C1917]"
                  >
                    <option value="Inaccurate location or species ID">
                      Inaccurate location or species identification
                    </option>
                    <option value="Disturbance to wildlife or sensitive habitat">
                      Ethical violation: Disturbance to sensitive habitat/nesting site
                    </option>
                    <option value="Spam or synthetic non-field media">
                      Spam or non-authentic field media
                    </option>
                    <option value="Uncivil comment or harassment">
                      Uncivil commentary or off-topic content
                    </option>
                  </select>
                  <input
                    type="text"
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Optional taxonomic or moderation notes..."
                    className="w-full px-3 py-2 rounded-md bg-[#F7F4EE] border border-[#D6CEBE] text-[#1C1917]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-md bg-[#9A3412] text-[#F7F4EE] font-medium hover:bg-[#7C2D12] transition-colors"
                  >
                    Submit Report
                  </button>
                </>
              )}
            </form>
          )}

          {/* Threaded Comments List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-[#57534E] font-semibold">
                Field Peer Review & Threaded Notes ({post.commentCount})
              </h3>
              <span className="text-[11px] text-[#78716C]">Live WebSocket Sync</span>
            </div>

            {topLevelComments.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#57534E]">
                No field notes recorded yet. Start the peer discussion below.
              </div>
            ) : (
              <div className="space-y-4">
                {topLevelComments.map((comment) => {
                  const replies = getReplies(comment.id);
                  return (
                    <div
                      key={comment.id}
                      className=" pb-4 border-b border-[#E6E1D6] last:border-none"
                    >
                      <div className="flex items-center justify-between text-xs text-[#57534E] mb-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectAuthor(comment.userUid);
                          }}
                          className="inline-flex items-center gap-2 font-semibold text-[#1C1917] hover:text-[#C85A32] transition-colors"
                        >
                          <UserAvatar
                            src={comment.authorAvatar}
                            name={comment.authorName}
                            size="sm"
                          />
                          <span>{comment.authorName}</span>
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setReplyTo(comment)}
                            className="hover:text-[#1B3B2B] font-medium"
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setReportTarget({
                                type: 'comment',
                                id: comment.id,
                                label: `Comment by ${comment.authorName}`,
                              })
                            }
                            className="hover:text-[#9A3412]"
                            title="Report comment"
                          >
                            Report
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#292524] leading-relaxed">
                        {comment.content}
                      </p>

                      {/* Threaded Replies */}
                      {replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-[#D6CEBE] space-y-3">
                          {replies.map((reply) => (
                            <div key={reply.id} className="text-xs">
                              <div className="flex items-center justify-between text-[#57534E] mb-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onSelectAuthor(reply.userUid);
                                  }}
                                  className="inline-flex items-center gap-1.5 font-semibold text-[#1C1917] hover:text-[#C85A32] transition-colors"
                                >
                                  <CornerDownRight className="w-3 h-3 text-[#78716C]" />
                                  <UserAvatar
                                    src={reply.authorAvatar}
                                    name={reply.authorName}
                                    size="xs"
                                  />
                                  <span>{reply.authorName}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReportTarget({
                                      type: 'comment',
                                      id: reply.id,
                                      label: `Reply by ${reply.authorName}`,
                                    })
                                  }
                                  className="hover:text-[#9A3412]"
                                >
                                  Report
                                </button>
                              </div>
                              <p className="text-sm text-[#292524] leading-relaxed">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comment Input Footer */}
          <form
            onSubmit={handleCommentSubmit}
            className="p-4 border-t border-[#D6CEBE] bg-[#EBE6DF]/60"
          >
            {replyTo && (
              <div className="flex items-center justify-between text-xs text-[#1B3B2B] mb-2 bg-[#E6E1D6] px-3 py-1.5 rounded-md">
                <span>Replying to {replyTo.authorName}</span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-[#57534E] hover:text-[#1C1917]"
                >
                  Cancel
                </button>
              </div>
            )}
            {commentError && (
              <div className="text-xs text-[#9A3412] mb-2">{commentError}</div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  firebaseUser
                    ? 'Add a taxonomic note or observation comment...'
                    : 'Sign in with Google to contribute a field comment...'
                }
                className="flex-1 px-3.5 py-2.5 text-sm rounded-lg bg-[#F7F4EE] border border-[#D6CEBE] text-[#1C1917] focus:outline-none focus:border-[#1B3B2B]"
              />
              <button
                type="submit"
                disabled={submittingComment}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1B3B2B] text-[#F7F4EE] text-xs font-medium hover:bg-[#142C20] transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{firebaseUser ? 'Post' : 'Sign In'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
