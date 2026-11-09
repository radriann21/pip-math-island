import { Navigate, useParams } from 'react-router-dom';
import { TOPICS } from '@/domain/exercises';
import { QuizContainer } from '../containers/QuizContainer';
import { PageShell } from './PageShell';

export function PlayPage() {
  const { topic } = useParams();
  const def = TOPICS.find((x) => x.id === topic);
  if (!def) return <Navigate to="/" replace />;
  return (
    <PageShell titleKey="page.play" bare>
      <QuizContainer key={def.id} topic={def.id} />
    </PageShell>
  );
}
