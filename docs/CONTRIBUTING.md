# Contributing to the Google Researcher MCP Server

First and foremost, thank you for considering contributing! It's people like you that make this open-source project a powerful and reliable tool for the community. Every contribution is valuable, whether it's a bug report, a new feature, or a documentation improvement.

To ensure a smooth and collaborative process, please read through these guidelines before you begin.

## Code of Conduct

We are committed to fostering an open and welcoming environment. All contributors are expected to adhere to our [**Code of Conduct**](./CODE_OF_CONDUCT.md). Please take a moment to read it before participating.

## How Can I Contribute?

- **Reporting Bugs**: If you find a bug, please create a detailed issue in our [GitHub Issues](https://github.com/zoharbabin/google-researcher-mcp/issues).
- **Suggesting Enhancements**: Have an idea for a new feature or an improvement? Open an issue to discuss it.
- **Writing Code**: Help fix bugs or implement new features.
- **Improving Documentation**: Correct typos, clarify confusing sections, or add new examples.
- **Testing**: Help us ensure reliability by running tests and reporting any failures.

## Getting Started: Your First Contribution

### Development Environment Setup

1.  **Fork the Repository**:
    Click the "Fork" button at the top right of the [project page](https://github.com/zoharbabin/google-researcher-mcp).

2.  **Clone Your Fork**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/google-research-mcp.git
    cd google-researcher-mcp
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    npx playwright install chromium
    ```

4.  **Configure Your Environment**:
    Copy the example environment file and add your API keys.
    ```bash
    cp .env.example .env
    ```
    *Note: You only need to fill in the keys for the services you intend to test or use.*

5.  **Run the Server in Development Mode**:
    ```bash
    npm run dev
    ```
    This will start the server and automatically reload it when you make changes.

6.  **Verify Everything Works**:
    ```bash
    npm run test:e2e:stdio
    ```
    If you see "🎉 All stdio-based end-to-end tests passed!", your setup is complete.

### Where to Start?

- **Just want to run it?** → [Quick Start in README](../README.md#quick-start)
- **Want to understand how it works?** → [Architecture Guide](./architecture/architecture.md)
- **Want to add a new tool?** → [Adding New Tools Guide](./ADDING_NEW_TOOLS.md)
- **Want to write tests?** → [Testing Guide](./testing-guide.md)
- **Need to deploy?** → [Docker section in README](../README.md#running-with-docker)

### Making Changes

1.  **Create a New Branch**:
    Work on a separate branch to keep your changes organized.
    ```bash
    git checkout -b feature/my-awesome-feature
    ```

2.  **Write Your Code**:
    - Adhere to the existing code style and conventions.
    - Write clear, commented code, especially for complex logic.
    - Ensure your code is covered by tests.

3.  **Run Tests**:
    Before submitting, ensure all tests pass. PRs that introduce new functionality should include corresponding tests.
    ```bash
    npm test
    ```
    To check test coverage:
    ```bash
    npm run test:coverage
    ```
    For the full testing philosophy and structure, see the [**Testing Guide**](./testing-guide.md).

4.  **Commit Your Changes**:
    Use a clear and descriptive commit message. We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
    ```bash
    git commit -m "feat: Add support for a new scraping library"
    ```

5.  **Push to Your Fork**:
    ```bash
    git push origin feature/my-awesome-feature
    ```

## Submitting a Pull Request

When you're ready, open a pull request from your fork to the main repository.

- **Provide a Clear Title and Description**: Explain the "what" and "why" of your changes.
- **Link to Relevant Issues**: If your PR addresses an open issue, link it using `Closes #123`.
- **Keep it Focused**: A pull request should address one specific feature or bug.
- **Allow Edits from Maintainers**: This helps us make small fixes or updates to your PR more efficiently.

## Coding and Style Guidelines

- **TypeScript**: We use TypeScript for type safety. Please include types for all new code.
- **Code Style**: Follow the existing code conventions in the codebase.
- **Error Handling**: All functions should handle potential errors gracefully.

## Documentation Standards

- If you add a new feature, please document it in the `README.md` or relevant files in the `docs/` directory.
- If you change existing functionality, update the corresponding documentation.
- New MCP tools must include detailed descriptions, parameter annotations, and a title — see the existing tools in `src/server.ts` for the expected metadata format.
- Add an entry to `docs/CHANGELOG.md` under the `[Unreleased]` section for any user-facing change.

## Versioning and Changelog

We use [Semantic Versioning](https://semver.org/). All changes are recorded in the [**CHANGELOG.md**](./CHANGELOG.md) file. For any user-facing change, please add an entry to the changelog under the "Unreleased" section.

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please do **not** open a public issue. Instead, use [GitHub's private vulnerability reporting](https://github.com/zoharbabin/google-researcher-mcp/security/advisories/new). We will address it as quickly as possible.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).