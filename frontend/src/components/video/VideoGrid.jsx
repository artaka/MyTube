import VideoCard from './VideoCard';

export default function VideoGrid({ videos }) {
  if (!videos.length) return null;
  return (
    <div className="video-grid">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
