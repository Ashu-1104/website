import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Heart, Paintbrush } from 'lucide-react';

import { formatCompactNumber } from '@/lib/format';
import { isVideoUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import FollowButton from '@/components/models/detail/FollowButton';
import ModelActions from '@/components/models/detail/ModelActions';
import ModelDescription from '@/components/models/detail/ModelDescription';
import ModelGallery from '@/components/models/detail/ModelGallery';
import ModelMediaCarousel from '@/components/models/detail/ModelMediaCarousel';
import CreateWithModelButton from '@/components/models/detail/CreateWithModelButton';

type ModelThumbnail = { id: string; imageUrl: string; sortOrder: number };

export type VersionInfo = {
  id: string;
  slug: string | null;
  version: string | null;
  baseModel: string;
  thumbnailUrl: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export type DbModelDetail = {
  id: string;
  name: string;
  description: string | null;
  modelType: string;
  baseModel: string;
  badge: string | null;
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  fileSize: number | null;
  triggerWord: string | null;
  usageTips: string | null;
  trainingSteps: number | null;
  trainingEpochs: number | null;
  downloads: number;
  likeCount: number;
  favoriteCount: number;
  usageCount: number;
  isNsfw: boolean;
  createdAt: string;
  creator: {
    id: string;
    handle: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    avatarDecoration: string | null;
    avatarDecorationUrl: string | null;
  };
  thumbnails: ModelThumbnail[];
};

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="model-detail-info-row">
      <span className="model-detail-info-label">{label}</span>
      <span className="model-detail-info-value">{children}</span>
    </div>
  );
}

export default function ModelDetailPage({
  model,
  versions,
}: {
  model: DbModelDetail;
  versions?: VersionInfo[];
}) {
  const images = [
    model.thumbnailUrl,
    ...model.thumbnails.map((t) => t.imageUrl),
  ].filter((value): value is string => Boolean(value));

  const avatarUrl = model.creator.avatarUrl ?? '/images/placeholder.svg';
  const creatorDecorationUrl = model.creator.avatarDecorationUrl ?? null;
  const creatorHasDecoration = Boolean(creatorDecorationUrl);

  const createdAt = new Date(model.createdAt);
  const createdText = Number.isNaN(createdAt.getTime())
    ? ''
    : `Created ${createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="model-detail-page">
      <header className="model-detail-header">
        <Link href="/models" className="model-detail-back" aria-label="Back to models">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="model-detail-title">{model.name}</h1>
        <div className="model-detail-usage" aria-label="Model usage count">
          <Paintbrush className="w-4 h-4" aria-hidden="true" />
          <span>{formatCompactNumber(model.usageCount)}</span>
        </div>
      </header>

      {versions && versions.length > 1 && (
        <div className="model-detail-versions">
          {versions.map((v) => {
            const label = v.version || v.baseModel;
            const href = `/models/${v.slug || v.id}`;
            return v.isCurrent ? (
              <span key={v.id} className="model-detail-version-tab model-detail-version-tab-active">
                {label}
              </span>
            ) : (
              <Link key={v.id} href={href} className="model-detail-version-tab">
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="model-detail-grid">
        <section className="model-detail-left">
          <div className="model-detail-surface">
            <ModelMediaCarousel images={images} modelName={model.name} />
          </div>
        </section>

        <aside className="model-detail-right">
          <div className="model-detail-actions">
            <CreateWithModelButton modelId={model.id} modelName={model.name} thumbnailUrl={model.thumbnailUrl} />
            <ModelActions modelId={model.id} modelName={model.name} />
          </div>

          <div className="model-detail-surface model-detail-uploader group">
            <Link
              href={`/user/${model.creator.handle ?? model.creator.id}`}
              className="block"
              aria-label={`View ${model.creator.handle ?? 'User'}'s profile`}
            >
              {/* Full-bleed banner background */}
              <div className="model-detail-uploader-banner">
                {model.creator.bannerUrl ? (
                  isVideoUrl(model.creator.bannerUrl) ? (
                    <video
                      src={model.creator.bannerUrl}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                      aria-hidden="true"
                    />
                  ) : (
                    <Image
                      src={model.creator.bannerUrl}
                      alt=""
                      fill
                      sizes="320px"
                      className="object-cover"
                      unoptimized={model.creator.bannerUrl.startsWith('data:')}
                    />
                  )
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-background-tertiary to-background-card" />
                )}
              </div>

              {/* Metrics overlay */}
              <div className="model-detail-uploader-metrics absolute top-3 left-3 z-10">
                <div className="model-detail-metric bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                  <Heart className="w-4 h-4 text-accent-pink" fill="currentColor" aria-hidden="true" />
                  <span>{formatCompactNumber(model.likeCount)}</span>
                </div>
              </div>

              {/* Uploader info overlaid on banner */}
              <div className="model-detail-uploader-body">
                <div className="model-detail-uploader-profile">
                  <div
                    className={cn(
                      'profile-avatar model-detail-uploader-avatar',
                      creatorHasDecoration && 'profile-avatar-decorated'
                    )}
                  >
                    <span className="profile-avatar-initial overflow-hidden">
                      <Image
                        src={avatarUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized={avatarUrl.startsWith('data:')}
                      />
                    </span>
                    {creatorDecorationUrl ? (
                      <Image
                        src={creatorDecorationUrl}
                        alt=""
                        fill
                        sizes="80px"
                        className="profile-avatar-decoration"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="model-detail-uploader-name group-hover:text-accent-pink transition-colors" title={model.creator.handle ?? 'User'}>
                      {model.creator.handle ?? 'User'}
                    </p>
                    <p className="model-detail-uploader-joined">{createdText}</p>
                  </div>
                </div>
              </div>
            </Link>
            <div className="absolute bottom-3 right-3 z-10">
              <FollowButton userId={model.creator.id} />
            </div>
          </div>

          <div className="model-detail-surface">
            <div className="model-detail-details-header">
              <h3 className="model-detail-surface-title">Details</h3>
            </div>

            <div className="model-detail-info">
              <InfoRow label="Type">
                <span className="model-detail-pill">{model.modelType}</span>
              </InfoRow>
              <InfoRow label="Base Model">
                <span>{model.baseModel}</span>
              </InfoRow>
              {model.badge && (
                <InfoRow label="Badge">
                  <span className="model-detail-pill">{model.badge}</span>
                </InfoRow>
              )}
              <InfoRow label="Stats">
                <span className="model-detail-chip-row">
                  <span className="model-detail-pill">Uses: {formatCompactNumber(model.usageCount)}</span>
                  <span className="model-detail-pill">Likes: {formatCompactNumber(model.likeCount)}</span>
                  <span className="model-detail-pill">Favorites: {formatCompactNumber(model.favoriteCount)}</span>
                </span>
              </InfoRow>
              {(model.trainingSteps || model.trainingEpochs) && (
                <InfoRow label="Training">
                  <span className="model-detail-chip-row">
                    {typeof model.trainingSteps === 'number' && (
                      <span className="model-detail-pill">Steps: {formatCompactNumber(model.trainingSteps)}</span>
                    )}
                    {typeof model.trainingEpochs === 'number' && (
                      <span className="model-detail-pill">Epochs: {formatCompactNumber(model.trainingEpochs)}</span>
                    )}
                  </span>
                </InfoRow>
              )}
              {model.triggerWord && (
                <InfoRow label="Trigger Word">
                  <span className="model-detail-pill">{model.triggerWord}</span>
                </InfoRow>
              )}
              {model.usageTips && (
                <InfoRow label="Usage Tips">
                  <span className="model-detail-pill">{model.usageTips}</span>
                </InfoRow>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ModelDescription text={model.description ?? 'No description provided.'} />

      <ModelGallery modelId={model.id} />
    </div>
  );
}
