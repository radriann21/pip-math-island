import { useNavigate, useParams } from 'react-router-dom';
import { ChildFormContainer } from '../containers/ChildFormContainer';
import { PageShell } from './PageShell';

export function ChildFormPage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  return (
    <PageShell titleKey={childId ? 'page.childEdit' : 'page.childNew'} onBack={() => navigate(-1)}>
      <ChildFormContainer childId={childId} />
    </PageShell>
  );
}
