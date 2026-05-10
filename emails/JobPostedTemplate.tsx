import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Heading, Hr } from '@react-email/components';

interface JobPostedTemplateProps {
  jobTitle: string;
  jobLocation: string;
  jobBudget: number;
  jobId: string;
}

export const JobPostedTemplate: React.FC<JobPostedTemplateProps> = ({
  jobTitle,
  jobLocation,
  jobBudget,
  jobId,
}) => {
  const jobUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${jobId}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>Job Posted Successfully! 🎉</Heading>
          </Section>

          <Section style={content}>
            <Text style={paragraph}>
              Great news! Your job has been posted and is now visible to workers in your area.
            </Text>

            <Section style={jobDetails}>
              <Heading style={h2}>Job Details:</Heading>
              <Text style={jobInfo}>
                <strong>Title:</strong> {jobTitle}
              </Text>
              <Text style={jobInfo}>
                <strong>Location:</strong> {jobLocation}
              </Text>
              <Text style={jobInfo}>
                <strong>Budget:</strong> KES {jobBudget?.toLocaleString()}
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={button} href={jobUrl}>
                View Job Details
              </Button>
            </Section>

            <Text style={footerText}>
              Workers in your area will now be able to see and apply for this job.
              You'll receive notifications when applications come in.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Local Fix Kenya - Connecting you with trusted local workers
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
  backgroundColor: '#1e40af',
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

const jobDetails = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
};

const jobInfo = {
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
  backgroundColor: '#1e40af',
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

export default JobPostedTemplate;