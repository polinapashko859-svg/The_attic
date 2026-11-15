import { Link } from 'react-router-dom';
import { normalizeSketchBranch, SKETCH_BRANCHES } from '../constants/sketchBranches';

export default function ProfileSketches({ sketches, emptyMessage }) {
  if (!sketches.length) {
    return <p className="profile-empty-publications">{emptyMessage}</p>;
  }

  return (
    <div className="profile-sketch-grid">
      {sketches.map((sketch) => {
        const branch = SKETCH_BRANCHES.find(
          (item) => item.value === normalizeSketchBranch(sketch.paperType)
        );

        return (
          <Link
            key={sketch.id}
            to={`/sketch/${sketch.id}`}
            className={`sketch-card profile-sketch-card paper-card-${normalizeSketchBranch(sketch.paperType)}`}
          >
            <span className="profile-sketch-branch">{branch?.shortLabel || 'Набросок'}</span>
            <h3>{sketch.title}</h3>
            <p>{sketch.content}</p>
            <time dateTime={sketch.createdAt}>
              {new Date(sketch.createdAt).toLocaleDateString('ru-RU')}
            </time>
          </Link>
        );
      })}
    </div>
  );
}
