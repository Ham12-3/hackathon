# Cursor Rules for Language Learning Tutor

This directory contains comprehensive coding guidelines for building a language learning tutor with MCP (Model Context Protocol), Fiberplane, Cloudflare Workers, and Hono.

## 📁 Rule Files

### `cloudflare.mdc`
- Core Cloudflare Workers best practices
- Durable Objects, KV, D1 integration patterns
- WebSocket hibernation API
- Agent SDK patterns
- General security and performance guidelines

### `language-tutor-mcp.mdc` 
- **Primary rules for your language tutor project**
- MCP server development and client integration
- Fiberplane development workflow  
- Educational features and learning analytics
- OAuth authentication patterns
- Deployment configuration for language learning

### `hono-integration.mdc`
- Hono framework-specific patterns
- API route organization and middleware
- MCP tool endpoint implementation
- OAuth flow with Hono
- Error handling and testing patterns

## 🎯 Quick Start Guide

1. **Follow the primary rules** in `language-tutor-mcp.mdc` for your main development
2. **Reference `hono-integration.mdc`** when building APIs and server logic
3. **Consult `cloudflare.mdc`** for general Cloudflare Workers best practices

## 🏗️ Project Architecture

```
Language Tutor
├── Remote MCP Server (Cloudflare Workers + Hono)
│   ├── Language learning tools (grammar, translation, flashcards)
│   ├── OAuth authentication
│   └── Progress tracking with Durable Objects
├── AI Tutor Agent (Cloudflare Agents SDK)  
│   ├── MCP client integration
│   ├── Conversational AI logic
│   └── Learning state management
└── Frontend (React + Fiberplane)
    ├── Chat interface
    ├── Progress visualization
    └── Real-time agent debugging
```

## 🛠️ Key Technologies

- **Cloudflare Workers**: Edge computing platform
- **Hono**: Fast, lightweight web framework  
- **MCP**: Model Context Protocol for AI tool integration
- **Fiberplane**: Development, debugging, and observability
- **Durable Objects**: Persistent state management
- **OAuth 2.0**: Secure authentication

## 📋 Development Workflow

1. **Scaffold** with Fiberplane Codegen
2. **Build MCP tools** for language learning
3. **Implement agent** with Cloudflare Agents SDK
4. **Test locally** with Fiberplane Playgrounds
5. **Deploy** to Cloudflare Workers
6. **Monitor** with structured logging and analytics

## 🔗 Essential Commands

```bash
# Start development
npm start

# Deploy to Cloudflare
npm run deploy

# Run tests
npm test

# Type checking
npm run check

# Format code
npm run format
```

## 🚀 Hack Night Goals

- [ ] Deploy remote MCP server with OAuth
- [ ] Implement core language learning tools
- [ ] Build conversational AI tutor agent
- [ ] Create interactive frontend with Fiberplane
- [ ] Demo real-time learning progress tracking
- [ ] Show dynamic tool discovery and execution

## 🔍 Cursor AI Guidelines

When working on this project, Cursor AI should:

1. **Follow MCP-first architecture** for all tool integrations
2. **Use Hono patterns** for all API development  
3. **Implement OAuth security** from the beginning
4. **Focus on educational effectiveness** in feature design
5. **Use Fiberplane** for development iteration and debugging
6. **Follow Cloudflare Workers best practices** for performance and security

## 📚 Reference Links

- [Cloudflare MCP Documentation](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [MCP Demo Day Blog Post](https://blog.cloudflare.com/mcp-demo-day/)
- [Hono Framework Documentation](https://hono.dev/)
- [Fiberplane Documentation](https://fiberplane.com/docs)
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)

---

*These rules are designed to help you build an effective, secure, and scalable language learning tutor during the hack night. Focus on the MCP integration and educational features that will make your demo stand out!* 