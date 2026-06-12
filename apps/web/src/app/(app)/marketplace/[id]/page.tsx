import { StrategyDetail } from '../_components/strategy-detail';

export const metadata = {
  title: 'Strategy Detail | JakartAgents',
};

export default function StrategyDetailPage({ params }: { params: { id: string } }) {
  return <StrategyDetail id={params.id} />;
}
