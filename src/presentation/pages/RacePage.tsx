import { useNavigate } from 'react-router-dom';
import { RaceContainer } from '../containers/RaceContainer';
import { PageShell } from './PageShell';

export default function RacePage() {
  const navigate = useNavigate();
  return (
    <PageShell titleKey="page.race" bare onBack={() => navigate('/')}>
      <RaceContainer />
    </PageShell>
  );
}
