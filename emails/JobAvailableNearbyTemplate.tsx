import React from 'react';
import { Html, Head, Body, Container, Section, Text, Button, Heading, Hr } from '@react-email/components';

interface JobAvailableNearbyTemplateProps {
  recipientName: string;
  jobTitle: string;
  jobLocation: string;
  jobId: string;
}

export const JobAvailableNearbyTemplate: React.FC<JobAvailableNearbyTemplateProps> = ({
  recipientName,
  jobTitle,
  jobLocation,
  jobId,
}) => {
  const jobUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/jobs/${jobId}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>New Job Opportunity Near You! 💼</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>
              Hi {recipientName || 'there'},
            </Text>

            <Text style={paragraph}>
              Great news! A new job has been posted in your location that matches your skills.
            </Text>

            <Section style={jobDetails}>
              <Heading style={h2}>Job Details:</Heading>
              <Text style={jobInfo}>
                <strong>Title:</strong> {jobTitle}
              </Text>
              <Text style={jobInfo}>
                <strong>Location:</strong> {jobLocation}
              </Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={button} href={jobUrl}>
                View Job & Apply
              </Button>
            </Section>

            <Text style={footerText}>
              Don't miss out on this opportunity! Apply now to increase your chances of getting hired.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Local Fix Kenya - Connecting skilled workers with local opportunities
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
  backgroundColor: '#059669',
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

const greeting = {
  color: '#374151',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '16px 0',
};

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const jobDetails = {
  backgroundColor: '#f0fdf4',
  padding: '20px',
  borderRadius: '8px',
  margin: '20px 0',
  border: '1px solid #bbf7d0',
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
  backgroundColor: '#059669',
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

export default JobAvailableNearbyTemplate;