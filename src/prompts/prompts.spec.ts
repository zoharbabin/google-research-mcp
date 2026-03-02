/**
 * Tests for MCP Prompts Module
 */

import { PROMPT_METADATA, PROMPT_NAMES } from './index.js';

describe('MCP Prompts', () => {
  describe('PROMPT_METADATA', () => {
    it('contains all expected prompts', () => {
      expect(PROMPT_METADATA).toHaveProperty('comprehensive-research');
      expect(PROMPT_METADATA).toHaveProperty('fact-check');
      expect(PROMPT_METADATA).toHaveProperty('summarize-url');
      expect(PROMPT_METADATA).toHaveProperty('news-briefing');
      expect(PROMPT_METADATA).toHaveProperty('due-diligence-background');
    });

    describe('comprehensive-research', () => {
      const prompt = PROMPT_METADATA['comprehensive-research'];

      it('has correct name', () => {
        expect(prompt.name).toBe('comprehensive-research');
      });

      it('has description', () => {
        expect(prompt.description).toContain('Research');
        expect(prompt.description.length).toBeGreaterThan(10);
      });

      it('has expected arguments', () => {
        expect(prompt.arguments).toContain('topic');
        expect(prompt.arguments).toContain('depth');
      });
    });

    describe('fact-check', () => {
      const prompt = PROMPT_METADATA['fact-check'];

      it('has correct name', () => {
        expect(prompt.name).toBe('fact-check');
      });

      it('has description about verification', () => {
        expect(prompt.description).toContain('Verify');
      });

      it('has expected arguments', () => {
        expect(prompt.arguments).toContain('claim');
        expect(prompt.arguments).toContain('sources');
      });
    });

    describe('summarize-url', () => {
      const prompt = PROMPT_METADATA['summarize-url'];

      it('has correct name', () => {
        expect(prompt.name).toBe('summarize-url');
      });

      it('has description about summarization', () => {
        expect(prompt.description).toContain('summarize');
      });

      it('has expected arguments', () => {
        expect(prompt.arguments).toContain('url');
        expect(prompt.arguments).toContain('format');
      });
    });

    describe('news-briefing', () => {
      const prompt = PROMPT_METADATA['news-briefing'];

      it('has correct name', () => {
        expect(prompt.name).toBe('news-briefing');
      });

      it('has description about news', () => {
        expect(prompt.description).toContain('news');
      });

      it('has expected arguments', () => {
        expect(prompt.arguments).toContain('topic');
        expect(prompt.arguments).toContain('timeRange');
      });
    });

    describe('due-diligence-background', () => {
      const prompt = PROMPT_METADATA['due-diligence-background'];

      it('has correct name', () => {
        expect(prompt.name).toBe('due-diligence-background');
      });

      it('has description about due diligence', () => {
        expect(prompt.description).toContain('due diligence');
      });

      it('has expected arguments', () => {
        expect(prompt.arguments).toContain('companyName');
        expect(prompt.arguments).toHaveLength(1);
      });
    });
  });

  describe('PROMPT_NAMES', () => {
    it('contains all prompt names', () => {
      expect(PROMPT_NAMES).toHaveLength(9);
      // Basic prompts
      expect(PROMPT_NAMES).toContain('comprehensive-research');
      expect(PROMPT_NAMES).toContain('fact-check');
      expect(PROMPT_NAMES).toContain('summarize-url');
      expect(PROMPT_NAMES).toContain('news-briefing');
      // Advanced prompts
      expect(PROMPT_NAMES).toContain('patent-portfolio-analysis');
      expect(PROMPT_NAMES).toContain('competitive-analysis');
      expect(PROMPT_NAMES).toContain('literature-review');
      expect(PROMPT_NAMES).toContain('technical-deep-dive');
      // Due diligence prompt
      expect(PROMPT_NAMES).toContain('due-diligence-background');
    });

    it('matches keys in PROMPT_METADATA', () => {
      const metadataKeys = Object.keys(PROMPT_METADATA);
      expect(PROMPT_NAMES).toEqual(expect.arrayContaining(metadataKeys));
      expect(metadataKeys).toEqual(expect.arrayContaining([...PROMPT_NAMES]));
    });
  });

  describe('Prompt argument structure', () => {
    it('all prompts have name property', () => {
      for (const name of PROMPT_NAMES) {
        expect(PROMPT_METADATA[name].name).toBe(name);
      }
    });

    it('all prompts have description', () => {
      for (const name of PROMPT_NAMES) {
        expect(PROMPT_METADATA[name].description).toBeDefined();
        expect(typeof PROMPT_METADATA[name].description).toBe('string');
        expect(PROMPT_METADATA[name].description.length).toBeGreaterThan(0);
      }
    });

    it('all prompts have arguments array', () => {
      for (const name of PROMPT_NAMES) {
        expect(Array.isArray(PROMPT_METADATA[name].arguments)).toBe(true);
        expect(PROMPT_METADATA[name].arguments.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Research depth options', () => {
    it('comprehensive-research supports depth argument', () => {
      const prompt = PROMPT_METADATA['comprehensive-research'];
      expect(prompt.arguments).toContain('depth');
    });

    // Note: Actual depth values (quick, standard, deep) are validated by Zod schema
    // in the registerPrompts function. These tests verify metadata structure.
  });

  describe('Summary format options', () => {
    it('summarize-url supports format argument', () => {
      const prompt = PROMPT_METADATA['summarize-url'];
      expect(prompt.arguments).toContain('format');
    });
  });

  describe('News time range options', () => {
    it('news-briefing supports timeRange argument', () => {
      const prompt = PROMPT_METADATA['news-briefing'];
      expect(prompt.arguments).toContain('timeRange');
    });
  });
});
