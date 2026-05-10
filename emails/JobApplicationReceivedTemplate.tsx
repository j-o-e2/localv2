import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Heading, Hr } from '@react-email/components';

interface JobApplicationReceivedTemplateProps {
  jobTitle: string;
  applicantName: string;
  jobId: string;
  applicationId: string;
}

export const JobApplicationReceivedTemplate: React.FC<JobApplicationReceivedTemplateProps> = ({
  jobTitle,
  applicantName,
  jobId,
  applicationId,
}) => {
  const jobUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${jobId}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>New Job Application! 📋</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>
              Great news! Someone has applied for your job posting.
            </Text>

            <Section style={applicationDetails}>
              <Heading style={h2}>Application Details:</Heading>
              <Text style={appInfo}>
                <strong>Job:</strong> {jobTitle}
              </Text>
              <Text style={appInfo}>
                <strong>Applicant:</strong> {applicantName}
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={button} href={jobUrl}>
                Review Application
              </Button>
            </Section>

            <Text style={footerText}>
              You can accept or reject this application from your dashboard.
              The applicant will be notified of your decision.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Local Fix Kenya - Managing your job applications made easy
            </Text>
            <Text style={footerText}>
              Need help? Contact us at support@localfixkenya.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#7c3aed',
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '24px 0 12px 0',
};

const content = {
  padding: '32px 24px',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const applicationDetails = {
  backgroundColor: '#faf5ff',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
  border: '1px solid #d8b4fe',
};

const appInfo = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const ctaSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#7c3aed',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

export default JobApplicationReceivedTemplate;