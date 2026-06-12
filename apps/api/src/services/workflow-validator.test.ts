import { validateWorkflow } from './workflow-validator.js';

const USER_CONFIG = {
  max_trade_size_pct: 25,
  stop_loss_pct: 10,
};

function makeWorkflow(nodes: Array<{ name: string; parameters?: Record<string, unknown> }>) {
  return {
    name: 'Test Workflow',
    nodes: nodes.map((n) => ({ type: 'n8n-nodes-base.httpRequest', ...n })),
    connections: {},
  };
}

describe('validateWorkflow', () => {
  it('returns passed: true for a complete valid workflow', () => {
    const workflow = makeWorkflow([
      { name: 'Get Market Data' },
      { name: 'AI Signal Analysis' },
      { name: 'Risk Check' },
      { name: 'Guardrail Check', parameters: { maxValuePerTx: 20, stopLossPct: 5 } },
      { name: 'Execute Trade' },
      { name: 'Commit Attestation' },
    ]);

    const result = validateWorkflow(workflow, USER_CONFIG);
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('returns passed: false with Risk Check issue when Execute Trade has no Risk Check', () => {
    const workflow = makeWorkflow([
      { name: 'Guardrail Check', parameters: { maxValuePerTx: 20 } },
      { name: 'Execute Trade' },
    ]);

    const result = validateWorkflow(workflow, USER_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => /Risk Check/i.test(i))).toBe(true);
  });

  it('returns passed: false with Guardrail Check issue when it is missing', () => {
    const workflow = makeWorkflow([
      { name: 'Get Market Data' },
      { name: 'Risk Check' },
    ]);

    const result = validateWorkflow(workflow, USER_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => /Guardrail Check/i.test(i))).toBe(true);
  });

  it('returns passed: false when maxValuePerTx exceeds user limit', () => {
    const workflow = makeWorkflow([
      { name: 'Risk Check' },
      {
        name: 'Guardrail Check',
        parameters: { maxValuePerTx: 50 }, // exceeds 25
      },
      { name: 'Execute Trade' },
    ]);

    const result = validateWorkflow(workflow, USER_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => /maxValuePerTx.*50.*25/.test(i))).toBe(true);
  });

  it('returns passed: false with structure issue for null nodes, no throw', () => {
    const workflow = { name: 'Bad', nodes: null, connections: {} };

    expect(() => validateWorkflow(workflow, USER_CONFIG)).not.toThrow();
    const result = validateWorkflow(workflow, USER_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('workflow structure invalid');
  });

  it('handles completely null input without throwing', () => {
    expect(() => validateWorkflow(null, USER_CONFIG)).not.toThrow();
    const result = validateWorkflow(null, USER_CONFIG);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('workflow structure invalid');
  });
});
