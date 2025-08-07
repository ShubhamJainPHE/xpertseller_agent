# XpertSeller - Amazon Seller Optimization Platform

Modern AI-powered platform built with Next.js 15 and TypeScript to help Amazon sellers optimize their products and increase revenue through smart automation and AI insights.

## 🗺️ **TABLE OF CONTENTS**
1. [Development Protocol & Quality Standards](#-development-protocol--quality-standards)
2. [Business Model & Requirements](#-business-model--requirements)
3. [Tech Stack & Architecture](#tech-stack)
4. [Database Schema](#database-schema)
5. [Performance Requirements & SLAs](#-performance-requirements--slas)
6. [Error Handling & Monitoring](#-error-handling--monitoring)
7. [Testing Framework](#-comprehensive-testing-framework)
8. [Production Deployment](#-production-deployment-guide)
9. [Development Workflow](#development-workflow)
10. [Security Implementation](#authentication)
11. [API Documentation](#api-endpoints)
12. [Success Metrics](#-success-metrics--definition-of-done)
13. [Resources](#-resources--references)

---

[Existing content remains the same...]

## Memory

- Pivotal memory: On 2024-02-15, decided to focus on building a next-gen AI-powered Amazon seller optimization platform that uses OpenAI GPT-4 for intelligent recommendations
- Core design principle established: Always solve real business pain points with minimal technical overhead
- Initial architecture review highlighted the importance of scalable, performant AI-driven solutions for e-commerce sellers
- 2024-03-01: Simplified authentication and Amazon connection flow implemented to reduce user friction and streamline onboarding process
- New auth strategy focuses on minimal steps: Email → OTP → Amazon Connection → Dashboard
- Removed complex onboarding fields and focused on essential user journey
- Implemented a 3-page flow with clear, concise user experience
- Maintained existing database schema and reused existing authentication mechanisms
- Prioritized user experience and quick time-to-value in the new authentication design