'use client';
import {
    Badge,
    Box,
    Collapse,
    Flex,
    Text,
    VStack,
    HStack,
    Divider,
    useDisclosure,
    Button,
    Code,
    List,
    ListItem,
    ListIcon,
} from '@chakra-ui/react';
import {
    CheckCircleIcon,
    XCircleIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ClockIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/20/solid';
import type { ComplianceResult, TestResult } from '@catalyst/schemas';

interface DetailedComplianceResultProps {
    result: ComplianceResult;
    isCompact?: boolean;
}

function TestStatusIcon({ success }: { success: boolean }) {
    return success ? (
        <CheckCircleIcon width={16} height={16} color="green" />
    ) : (
        <XCircleIcon width={16} height={16} color="red" />
    );
}

function TestTypeLabel({ testType }: { testType: string }) {
    const labels: Record<string, string> = {
        authentication_compliance: 'Authentication Compliance',
        schema_introspection: 'GraphQL Introspection',
        schema_compliance: 'Schema Compliance',
        federation_support: 'Federation Support',
    };
    return <Text fontWeight="medium">{labels[testType] || testType}</Text>;
}

function JWTValidationDetails({ test }: { test: TestResult }) {
    // Use structured test details if available, otherwise fall back to parsing error string
    if (test.jwtTestDetails) {
        const { validToken, invalidToken, noToken } = test.jwtTestDetails;

        const tests = [
            {
                name: 'Valid Token Test',
                description: 'Channel should accept valid JWT tokens',
                passed: validToken.accepted,
                error: validToken.error,
                statusCode: validToken.statusCode,
            },
            {
                name: 'Invalid Token Rejection Test',
                description: 'Channel should reject invalid JWT tokens',
                passed: invalidToken.accepted,
                error: invalidToken.error,
                statusCode: invalidToken.statusCode,
            },
            {
                name: 'Missing Token Rejection Test',
                description: 'Channel should reject requests without tokens',
                passed: noToken.accepted,
                error: noToken.error,
                statusCode: noToken.statusCode,
            },
        ];

        return (
            <VStack align="stretch" spacing={2} mt={2} pl={4}>
                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                    JWT Authentication Tests:
                </Text>
                <List spacing={3}>
                    {tests.map((test, index) => (
                        <ListItem key={index} fontSize="sm" display="flex" alignItems="start">
                            <ListIcon
                                as={() =>
                                    test.passed ? (
                                        <CheckCircleIcon width={14} height={14} />
                                    ) : (
                                        <XCircleIcon width={14} height={14} />
                                    )
                                }
                                color={test.passed ? 'green.500' : 'red.500'}
                                mt={0.5}
                            />
                            <Box flex="1">
                                <Text fontWeight="medium" color={test.passed ? 'gray.700' : 'red.700'}>
                                    {test.name}
                                </Text>
                                <Text color="gray.500" fontSize="xs" mt={0.5}>
                                    {test.description}
                                </Text>
                                {!test.passed && test.error && (
                                    <Text color="red.600" mt={1}>
                                        {test.error}
                                        {test.statusCode && ` (Status: ${test.statusCode})`}
                                    </Text>
                                )}
                                {test.passed && test.statusCode && (
                                    <Text color="gray.500" fontSize="xs" mt={1}>
                                        Status Code: {test.statusCode}
                                    </Text>
                                )}
                            </Box>
                        </ListItem>
                    ))}
                </List>
            </VStack>
        );
    }

    // Fallback to parsing error string if no structured data
    if (!test.errorDetails) return null;

    const errors = test.errorDetails.split('; ').filter(Boolean);

    return (
        <VStack align="stretch" spacing={2} mt={2} pl={4}>
            <Text fontSize="sm" color="gray.600" fontWeight="medium">
                JWT Authentication Tests:
            </Text>
            <List spacing={2}>
                {errors.map((error, index) => {
                    const icon = <XCircleIcon width={14} height={14} />;
                    const colorScheme = 'red.500';
                    let testName = '';
                    let errorMessage = error;

                    if (error.includes('Valid token rejected')) {
                        testName = 'Valid Token Test';
                        errorMessage = error.replace('Valid token rejected: ', '');
                    } else if (error.includes('Invalid token test failed')) {
                        testName = 'Invalid Token Rejection Test';
                        errorMessage = error.replace('Invalid token test failed: ', '');
                    } else if (error.includes('No token test failed')) {
                        testName = 'Missing Token Rejection Test';
                        errorMessage = error.replace('No token test failed: ', '');
                    }

                    return (
                        <ListItem key={index} fontSize="sm" display="flex" alignItems="start">
                            <ListIcon as={() => icon} color={colorScheme} mt={0.5} />
                            <Box flex="1">
                                <Text fontWeight="medium" color="gray.700">
                                    {testName || `Test ${index + 1}`}
                                </Text>
                                <Text color="gray.600" mt={0.5}>
                                    {errorMessage}
                                </Text>
                            </Box>
                        </ListItem>
                    );
                })}
            </List>
        </VStack>
    );
}

function TestResultItem({ test, isLast }: { test: TestResult; isLast: boolean }) {
    const { isOpen, onToggle } = useDisclosure();
    const hasDetails = !test.success && test.errorDetails;

    return (
        <Box>
            <Flex align="center" justify="space-between" py={2}>
                <HStack spacing={3} flex="1">
                    <TestStatusIcon success={test.success} />
                    <TestTypeLabel testType={test.testType} />
                    {test.duration && (
                        <Badge colorScheme="gray" size="sm">
                            <HStack spacing={1}>
                                <ClockIcon width={12} height={12} />
                                <Text>{test.duration}ms</Text>
                            </HStack>
                        </Badge>
                    )}
                </HStack>
                {hasDetails && (
                    <Button
                        size="xs"
                        variant="ghost"
                        onClick={onToggle}
                        rightIcon={isOpen ? <ChevronDownIcon width={14} /> : <ChevronRightIcon width={14} />}
                    >
                        Details
                    </Button>
                )}
            </Flex>

            {hasDetails && (
                <Collapse in={isOpen}>
                    <Box pl={7} pb={2}>
                        {test.testType === 'authentication_compliance' ? (
                            <JWTValidationDetails test={test} />
                        ) : (
                            <Code fontSize="sm" p={2} borderRadius="md" display="block" whiteSpace="pre-wrap">
                                {test.errorDetails}
                            </Code>
                        )}
                    </Box>
                </Collapse>
            )}

            {!isLast && <Divider />}
        </Box>
    );
}

export function DetailedComplianceResult({ result, isCompact = false }: DetailedComplianceResultProps) {
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: result.status !== 'compliant' });
    const hasTests = result.details?.tests && result.details.tests.length > 0;

    // Calculate summary statistics
    const totalTests = result.details?.tests?.length || 0;
    const passedTests = result.details?.tests?.filter((t) => t.success).length || 0;
    const failedTests = totalTests - passedTests;

    if (isCompact) {
        // Compact view for list/table display
        return (
            <HStack spacing={2}>
                <Badge
                    colorScheme={result.status === 'compliant' ? 'green' : result.status === 'error' ? 'orange' : 'red'}
                >
                    {result.status}
                </Badge>
                {hasTests && (
                    <Text fontSize="xs" color="gray.600">
                        {passedTests}/{totalTests} tests passed
                    </Text>
                )}
            </HStack>
        );
    }

    return (
        <Box borderWidth={1} borderRadius="lg" p={4} bg="white" shadow="sm">
            {/* Header */}
            <Flex align="center" justify="space-between" mb={hasTests ? 3 : 0}>
                <HStack spacing={3}>
                    <Badge
                        colorScheme={
                            result.status === 'compliant' ? 'green' : result.status === 'error' ? 'orange' : 'red'
                        }
                        fontSize="sm"
                        px={2}
                        py={1}
                    >
                        {result.status.toUpperCase()}
                    </Badge>

                    {hasTests && (
                        <HStack spacing={4} fontSize="sm">
                            <HStack spacing={1}>
                                <CheckCircleIcon width={14} height={14} color="green" />
                                <Text>{passedTests} passed</Text>
                            </HStack>
                            {failedTests > 0 && (
                                <HStack spacing={1}>
                                    <XCircleIcon width={14} height={14} color="red" />
                                    <Text>{failedTests} failed</Text>
                                </HStack>
                            )}
                            {result.details?.duration && (
                                <HStack spacing={1} color="gray.600">
                                    <ClockIcon width={14} height={14} />
                                    <Text>{result.details.duration}ms total</Text>
                                </HStack>
                            )}
                        </HStack>
                    )}
                </HStack>

                {hasTests && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onToggle}
                        rightIcon={isOpen ? <ChevronDownIcon width={16} /> : <ChevronRightIcon width={16} />}
                    >
                        {isOpen ? 'Hide' : 'Show'} Details
                    </Button>
                )}
            </Flex>

            {/* Error message if present */}
            {result.error && (
                <Box bg="red.50" p={3} borderRadius="md" mb={3}>
                    <HStack align="start" spacing={2}>
                        <ExclamationTriangleIcon width={16} height={16} color="red" />
                        <Text fontSize="sm" color="red.700">
                            {result.error}
                        </Text>
                    </HStack>
                </Box>
            )}

            {/* Test results details */}
            {hasTests && (
                <Collapse in={isOpen}>
                    <VStack align="stretch" spacing={0} mt={3}>
                        <Divider mb={2} />
                        {result.details.tests.map((test, index) => (
                            <TestResultItem
                                key={`${test.testType}-${index}`}
                                test={test}
                                isLast={index === result.details.tests.length - 1}
                            />
                        ))}
                    </VStack>
                </Collapse>
            )}

            {/* Channel details footer */}
            <Box mt={3} pt={3} borderTopWidth={1} fontSize="xs" color="gray.600">
                <HStack spacing={4}>
                    <Text>Channel: {result.channelId.substring(0, 8)}...</Text>
                    {result.details?.endpoint && <Text>Endpoint: {new URL(result.details.endpoint).hostname}</Text>}
                    {result.timestamp && <Text>Checked: {new Date(result.timestamp).toLocaleString()}</Text>}
                </HStack>
            </Box>
        </Box>
    );
}
