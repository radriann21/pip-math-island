import { useNavigate } from 'react-router-dom';
import { ParentContainer } from '../containers/ParentContainer';
import { PageShell } from './PageShell';

export default function ParentPage() {
  const navigate = useNavigate();
  return (
    <PageShell titleKey="page.parent" onBack={() => navigate('/')}>
      <ParentContainer />
    </PageShell>
  );
}
