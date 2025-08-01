import { obj2Query } from '@/api/tools';
import MyIcon from '@/components/Icon';
import { MyRangeSlider, MySelect, MySlider, MyTooltip, RangeInput, Tabs, Tip } from '@sealos/ui';
import { APPLICATION_PROTOCOLS, defaultSliderKey, ProtocolList } from '@/constants/app';
import { GpuAmountMarkList } from '@/constants/editApp';
import { useToast } from '@/hooks/useToast';
import { useGlobalStore } from '@/store/global';
import { SEALOS_DOMAIN } from '@/store/static';
import { useUserStore } from '@/store/user';
import type { QueryType } from '@/types';
import { type AppEditType } from '@/types/app';
import { sliderNumber2MarkList } from '@/utils/adapt';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  FormControl,
  Grid,
  IconButton,
  Input,
  Switch,
  Tooltip,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { throttle } from 'lodash';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import type { ConfigMapType } from './ConfigmapModal';
import type { CustomAccessModalParams } from './CustomAccessModal';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import type { StoreType } from './StoreModal';
import styles from './index.module.scss';
import { mountPathToConfigMapKey, useCopyData } from '@/utils/tools';

const CustomAccessModal = dynamic(() => import('./CustomAccessModal'));
const ConfigmapModal = dynamic(() => import('./ConfigmapModal'));
const StoreModal = dynamic(() => import('./StoreModal'));
const EditEnvs = dynamic(() => import('./EditEnvs'));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);

const labelWidth = 120;

const Form = ({
  formHook,
  already,
  defaultStorePathList,
  countGpuInventory,
  pxVal,
  refresh,
  isAdvancedOpen
}: {
  formHook: UseFormReturn<AppEditType, any>;
  already: boolean;
  defaultStorePathList: string[];
  countGpuInventory: (type?: string) => number;
  pxVal: number;
  refresh: boolean;
  isAdvancedOpen: boolean;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const { formSliderListConfig } = useGlobalStore();
  const { userSourcePrice } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();
  const { copyData } = useCopyData();
  const { name } = router.query as QueryType;
  const theme = useTheme();
  const isEdit = useMemo(() => !!name, [name]);
  const {
    register,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = formHook;

  const {
    fields: networks,
    append: appendNetworks,
    remove: removeNetworks,
    update: updateNetworks
  } = useFieldArray({
    control,
    name: 'networks'
  });

  const { fields: envs, replace: replaceEnvs } = useFieldArray({
    control,
    name: 'envs'
  });
  const {
    fields: configMaps,
    append: appendConfigMaps,
    remove: removeConfigMaps
  } = useFieldArray({
    control,
    name: 'configMapList'
  });
  const {
    fields: storeList,
    append: appendStoreList,
    remove: removeStoreList
  } = useFieldArray({
    control,
    name: 'storeList'
  });

  const navList = useMemo(
    () => [
      {
        id: 'baseInfo',
        label: 'Basic Config',
        icon: 'formInfo',
        isSetting:
          getValues('appName') &&
          getValues('imageName') &&
          (getValues('secret.use')
            ? getValues('secret.username') &&
              getValues('secret.password') &&
              getValues('secret.serverAddress')
            : true)
      },
      {
        id: 'network',
        label: 'Network Configuration',
        icon: 'network',
        isSetting: getValues('networks').length > 0
      },
      {
        id: 'settings',
        label: 'Advanced Configuration',
        icon: 'settings',
        isSetting:
          getValues('runCMD') ||
          getValues('cmdParam') ||
          getValues('envs').length > 0 ||
          getValues('configMapList').length > 0 ||
          getValues('storeList').length > 0
      }
    ],
    [getValues, refresh]
  );

  const [activeNav, setActiveNav] = useState(navList[0].id);
  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>();
  const [configEdit, setConfigEdit] = useState<ConfigMapType>();
  const [storeEdit, setStoreEdit] = useState<StoreType>();
  const { isOpen: isEditEnvs, onOpen: onOpenEditEnvs, onClose: onCloseEditEnvs } = useDisclosure();

  // listen scroll and set activeNav
  useEffect(() => {
    const scrollFn = throttle((e: Event) => {
      if (!e.target) return;
      const doms = navList.map((item) => ({
        dom: document.getElementById(item.id),
        id: item.id
      }));

      const dom = e.target as HTMLDivElement;
      const scrollTop = dom.scrollTop;

      for (let i = doms.length - 1; i >= 0; i--) {
        const offsetTop = doms[i].dom?.offsetTop || 0;
        if (scrollTop + 200 >= offsetTop) {
          setActiveNav(doms[i].id);
          break;
        }
      }
    }, 200);
    document.getElementById('form-container')?.addEventListener('scroll', scrollFn);
    return () => {
      document.getElementById('form-container')?.removeEventListener('scroll', scrollFn);
    };
    // eslint-disable-next-line
  }, []);

  // common form label
  const Label = ({
    children,
    w = labelWidth,
    ...props
  }: {
    children: string;
    w?: number | 'auto';
    [key: string]: any;
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      color={'grayModern.900'}
      fontWeight={'bold'}
      userSelect={'none'}
      {...props}
    >
      {children}
    </Box>
  );

  const boxStyles = {
    border: theme.borders.base,
    borderRadius: 'lg',
    mb: 4,
    bg: 'white'
  };

  const headerStyles = {
    py: 4,
    pl: '42px',
    borderTopRadius: 'lg',
    fontSize: 'xl',
    color: 'grayModern.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'grayModern.50'
  };

  // add NoGPU select item
  const gpuSelectList = useMemo(
    () =>
      userSourcePrice?.gpu
        ? [
            {
              label: t('No GPU'),
              value: ''
            },
            ...userSourcePrice.gpu.map((item) => ({
              icon: 'nvidia',
              label: (
                <Flex>
                  <Box color={'myGray.900'}>{item.alias}</Box>
                  <Box mx={3} color={'grayModern.900'}>
                    |
                  </Box>
                  <Box color={'grayModern.900'}>
                    {t('vm')} : {Math.round(item.vm)}G
                  </Box>
                  <Box mx={3} color={'grayModern.900'}>
                    |
                  </Box>
                  <Flex pr={3}>
                    <Box color={'grayModern.900'}>{t('Inventory')}&ensp;:&ensp;</Box>
                    <Box color={'#FB7C3C'}>{countGpuInventory(item.type)}</Box>
                  </Flex>
                </Flex>
              ),
              value: item.type
            }))
          ]
        : [],
    [countGpuInventory, t, userSourcePrice?.gpu, refresh]
  );
  const selectedGpu = useMemo(() => {
    const selected = userSourcePrice?.gpu?.find((item) => item.type === getValues('gpu.type'));
    if (!selected) return;
    return {
      ...selected,
      inventory: countGpuInventory(selected.type)
    };
  }, [userSourcePrice?.gpu, countGpuInventory, getValues, refresh]);

  // cpu, memory have different sliderValue
  const countSliderList = useCallback(() => {
    const gpuType = getValues('gpu.type');
    const key = gpuType && formSliderListConfig[gpuType] ? gpuType : defaultSliderKey;

    const cpu = getValues('cpu');
    const memory = getValues('memory');

    const cpuList = formSliderListConfig[key].cpu;
    const memoryList = formSliderListConfig[key].memory;

    const sortedCpuList = !!gpuType
      ? cpuList
      : cpu !== undefined
      ? [...new Set([...cpuList, cpu])].sort((a, b) => a - b)
      : cpuList;

    const sortedMemoryList = !!gpuType
      ? memoryList
      : memory !== undefined
      ? [...new Set([...memoryList, memory])].sort((a, b) => a - b)
      : memoryList;

    return {
      cpu: sliderNumber2MarkList({
        val: sortedCpuList,
        type: 'cpu',
        gpuAmount: getValues('gpu.amount')
      }),
      memory: sliderNumber2MarkList({
        val: sortedMemoryList,
        type: 'memory',
        gpuAmount: getValues('gpu.amount')
      })
    };
  }, [formSliderListConfig, getValues]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const SliderList = useMemo(() => countSliderList(), [already, refresh]);

  const persistentVolumes = useMemo(() => {
    return getValues('volumes')
      .filter((item) => 'persistentVolumeClaim' in item)
      .reduce(
        (
          acc: {
            path: string;
            name: string;
          }[],
          volume
        ) => {
          const mount = getValues('volumeMounts').find((m) => m.name === volume.name);
          if (mount) {
            acc.push({
              path: mount.mountPath,
              name: volume.name
            });
          }
          return acc;
        },
        []
      );
  }, [getValues, refresh]);

  return (
    <>
      <Grid
        height={'100%'}
        templateColumns={'220px 1fr'}
        gridGap={5}
        alignItems={'start'}
        pl={`${pxVal}px`}
      >
        <Box>
          <Tabs
            list={[
              { id: 'form', label: t('Config Form') },
              { id: 'yaml', label: t('YAML File') }
            ]}
            activeId={'form'}
            onChange={() =>
              router.replace(
                `/app/edit?${obj2Query({
                  name,
                  type: 'yaml'
                })}`
              )
            }
          />
          <Box
            mt={3}
            borderRadius={'md'}
            overflow={'hidden'}
            backgroundColor={'white'}
            border={theme.borders.base}
            p={'4px'}
          >
            {navList.map((item) => (
              <Box key={item.id} onClick={() => router.replace(`#${item.id}`)}>
                <Flex
                  borderRadius={'base'}
                  cursor={'pointer'}
                  gap={'8px'}
                  alignItems={'center'}
                  h={'40px'}
                  _hover={{
                    backgroundColor: 'grayModern.100'
                  }}
                  color="grayModern.900"
                  backgroundColor={activeNav === item.id ? 'grayModern.100' : 'transparent'}
                >
                  <Box
                    w={'2px'}
                    h={'24px'}
                    justifySelf={'start'}
                    bg={'grayModern.900'}
                    borderRadius={'12px'}
                    opacity={activeNav === item.id ? 1 : 0}
                  ></Box>
                  <MyIcon
                    name={item.icon as any}
                    w={'20px'}
                    h={'20px'}
                    color={activeNav === item.id ? 'grayModern.900' : 'grayModern.500'}
                  />
                  <Box>{t(item.label)}</Box>
                </Flex>
              </Box>
            ))}
          </Box>
          {userSourcePrice && (
            <Box mt={3} overflow={'hidden'}>
              <QuotaBox />
            </Box>
          )}
          {userSourcePrice && (
            <Box mt={3} overflow={'hidden'}>
              <PriceBox
                pods={
                  getValues('hpa.use')
                    ? [getValues('hpa.minReplicas') || 1, getValues('hpa.maxReplicas') || 2]
                    : [getValues('replicas') || 1, getValues('replicas') || 1]
                }
                cpu={getValues('cpu')}
                memory={getValues('memory')}
                storage={getValues('storeList').reduce((sum, item) => sum + item.value, 0)}
                gpu={
                  !!getValues('gpu.type')
                    ? {
                        type: getValues('gpu.type'),
                        amount: getValues('gpu.amount')
                      }
                    : undefined
                }
                nodeports={getValues('networks').filter((item) => item.openNodePort)?.length || 0}
              />
            </Box>
          )}
        </Box>

        <Box
          id={'form-container'}
          pr={`${pxVal}px`}
          height={'100%'}
          position={'relative'}
          // overflowY={'scroll'}
        >
          {/* base info */}
          <Box id={'baseInfo'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
              {t('Basic Config')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              {/* app name */}
              <FormControl mb={7} isInvalid={!!errors.appName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label>{t('App Name')}</Label>
                  <Input
                    width={'350px'}
                    disabled={isEdit}
                    title={isEdit ? t('Not allowed to change app name') || '' : ''}
                    autoFocus={true}
                    maxLength={60}
                    placeholder={
                      t(
                        'Starts with a letter and can contain only lowercase letters, digits, and hyphens (-)'
                      ) || ''
                    }
                    {...register('appName', {
                      required: t('Not allowed to change app name') || '',
                      maxLength: 60,
                      pattern: {
                        value: /[a-z]([-a-z0-9]*[a-z0-9])?/g,
                        message: t(
                          'The application name can contain only lowercase letters, digits, and hyphens (-) and must start with a letter'
                        )
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              {/* image */}
              <Box mb={7} className="driver-deploy-image">
                <Flex alignItems={'center'}>
                  <Label>{t('Image')}</Label>
                  <Tabs
                    w={'126px'}
                    size={'sm'}
                    list={[
                      {
                        label: t('public'),
                        id: `public`
                      },
                      {
                        label: t('private'),
                        id: `private`
                      }
                    ]}
                    activeId={getValues('secret.use') ? 'private' : 'public'}
                    onChange={(val) => {
                      if (val === 'public') {
                        setValue('secret.use', false);
                      } else {
                        setValue('secret.use', true);
                      }
                    }}
                  />
                </Flex>
                <Box mt={4} pl={`${labelWidth}px`}>
                  <FormControl isInvalid={!!errors.imageName} w={'420px'}>
                    <Box mb={1} fontSize={'sm'}>
                      {t('Image Name')}
                    </Box>
                    <Input
                      width={'350px'}
                      value={getValues('imageName')}
                      backgroundColor={getValues('imageName') ? 'myWhite.500' : 'grayModern.100'}
                      placeholder={`${t('Image Name')}`}
                      {...register('imageName', {
                        required: 'Image name cannot be empty',
                        setValueAs(e) {
                          return e.replace(/\s*/g, '');
                        }
                      })}
                    />
                  </FormControl>
                  {getValues('secret.use') ? (
                    <>
                      <FormControl mt={4} isInvalid={!!errors.secret?.username} w={'420px'}>
                        <Box mb={1} fontSize={'sm'}>
                          {t('Username')}
                        </Box>
                        <Input
                          backgroundColor={
                            getValues('imageName') ? 'myWhite.500' : 'grayModern.100'
                          }
                          placeholder={`${t('Username for the image registry')}`}
                          {...register('secret.username', {
                            required: t('The user name cannot be empty') || ''
                          })}
                        />
                      </FormControl>
                      <FormControl mt={4} isInvalid={!!errors.secret?.password} w={'420px'}>
                        <Box mb={1} fontSize={'sm'}>
                          {t('Password')}
                        </Box>
                        <Input
                          type={'password'}
                          placeholder={`${t('Password for the image registry')}`}
                          backgroundColor={
                            getValues('imageName') ? 'myWhite.500' : 'grayModern.100'
                          }
                          {...register('secret.password', {
                            required: t('The password cannot be empty') || ''
                          })}
                        />
                      </FormControl>
                      <FormControl mt={4} isInvalid={!!errors.secret?.serverAddress} w={'420px'}>
                        <Box mb={1} fontSize={'sm'}>
                          {t('Image Address')}
                        </Box>
                        <Input
                          backgroundColor={
                            getValues('imageName') ? 'myWhite.500' : 'grayModern.100'
                          }
                          placeholder={`${t('Image Address')}`}
                          {...register('secret.serverAddress', {
                            required: t('The image cannot be empty') || ''
                          })}
                        />
                      </FormControl>
                    </>
                  ) : null}
                </Box>
              </Box>
              {/* replicas */}
              <Box mb={7}>
                <Flex alignItems={'center'}>
                  <Label>{t('Deployment Mode')}</Label>
                  <Tabs
                    className="driver-deploy-instance"
                    w={'195px'}
                    size={'sm'}
                    list={[
                      {
                        label: t('Fixed instance'),
                        id: `static`
                      },
                      {
                        label: t('Auto scaling'),
                        id: `hpa`
                      }
                    ]}
                    activeId={getValues('hpa.use') ? 'hpa' : 'static'}
                    onChange={(val) => {
                      if (val === 'static') {
                        setValue('hpa.use', false);
                      } else {
                        setValue('hpa.use', true);
                      }
                    }}
                  />
                </Flex>
                <Box mt={4} pl={`${labelWidth}px`}>
                  {getValues('hpa.use') ? (
                    <>
                      <Flex alignItems={'center'}>
                        <MySelect
                          width={'120px'}
                          height="32px"
                          value={getValues('hpa.target')}
                          list={[
                            { value: 'cpu', label: t('CPU') },
                            { value: 'memory', label: t('Memory') },
                            ...(userSourcePrice?.gpu ? [{ label: 'GPU', value: 'gpu' }] : [])
                          ]}
                          onchange={(val: any) => setValue('hpa.target', val)}
                        />
                        <Input
                          width={'80px'}
                          type={'number'}
                          backgroundColor={
                            getValues('hpa.value') ? 'myWhite.500' : 'grayModern.100'
                          }
                          mx={2}
                          {...register('hpa.value', {
                            required: t('The Cpu target is empty') || '',
                            valueAsNumber: true,
                            min: {
                              value: 1,
                              message: t('The cpu target value must be positive')
                            },
                            max: {
                              value: 100,
                              message: t('The target cpu value must be less than 100')
                            }
                          })}
                        />
                        <Box>{getValues('hpa.target') === 'gpu' ? '' : '%'}</Box>
                        <Tip
                          ml={4}
                          icon={<InfoOutlineIcon />}
                          text={t('CPU target is the CPU utilization rate of any container')}
                          size="sm"
                        />
                      </Flex>

                      <Box mt={5} pb={5} pr={3}>
                        <Label mb={1} fontSize={'sm'}>
                          {t('Replicas')}
                        </Label>
                        <Box w={'410px'} ml={'7px'}>
                          <MyRangeSlider
                            min={1}
                            max={20}
                            step={1}
                            value={[getValues('hpa.minReplicas'), getValues('hpa.maxReplicas')]}
                            setVal={(e) => {
                              setValue('hpa.minReplicas', e[0]);
                              setValue('hpa.maxReplicas', e[1]);
                            }}
                          />
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Flex alignItems={'center'}>
                      <Label w={'auto'} mr={3} fontSize={'12px'}>
                        {t('Replicas')}
                      </Label>
                      <RangeInput
                        value={getValues('replicas')}
                        min={1}
                        max={20}
                        hoverText={
                          t('Number of instances: 1 to 20') || 'Number of instances: 1 to 20'
                        }
                        setVal={(val) => {
                          register('replicas', {
                            required:
                              t('The number of instances cannot be empty') ||
                              'The number of instances cannot be empty',
                            min: {
                              value: 1,
                              message: t('The minimum number of instances is 1')
                            },
                            max: {
                              value: 20,
                              message: t('The maximum number of instances is 20')
                            }
                          });
                          setValue('replicas', val || '');
                        }}
                      />
                    </Flex>
                  )}
                </Box>
              </Box>

              {userSourcePrice?.gpu && (
                <Box mb={7}>
                  <Flex alignItems={'center'}>
                    <Label>GPU</Label>
                    <MySelect
                      width={'300px'}
                      placeholder={t('No GPU') || ''}
                      value={getValues('gpu.type')}
                      list={gpuSelectList}
                      onchange={(type: any) => {
                        const selected = userSourcePrice?.gpu?.find((item) => item.type === type);
                        const inventory = countGpuInventory(type);
                        if (type === '' || (selected && inventory > 0)) {
                          setValue('gpu.type', type);
                          const sliderList = countSliderList();
                          setValue('cpu', sliderList.cpu[1].value);
                          setValue('memory', sliderList.memory[1].value);
                        }
                      }}
                    />
                  </Flex>
                  {!!getValues('gpu.type') && (
                    <Box mt={4} pl={`${labelWidth}px`}>
                      <Box mb={1}>{t('Amount')}</Box>
                      <Flex alignItems={'center'}>
                        {GpuAmountMarkList.map((item) => {
                          const inventory = selectedGpu?.inventory || 0;
                          const hasInventory = item.value <= inventory;

                          return (
                            <MyTooltip
                              key={item.value}
                              label={hasInventory ? '' : t('Under Stock')}
                            >
                              <Center
                                mr={2}
                                w={'32px'}
                                h={'32px'}
                                borderRadius={'md'}
                                border={'1px solid'}
                                bg={'white'}
                                {...(getValues('gpu.amount') === item.value
                                  ? {
                                      borderColor: 'brightBlue.500',
                                      boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
                                    }
                                  : {
                                      borderColor: 'grayModern.200',
                                      bgColor: 'grayModern.100'
                                    })}
                                {...(hasInventory
                                  ? {
                                      cursor: 'pointer',
                                      onClick: () => {
                                        setValue('gpu.amount', item.value);
                                        const sliderList = countSliderList();
                                        setValue('cpu', sliderList.cpu[1].value);
                                        setValue('memory', sliderList.memory[1].value);
                                      }
                                    }
                                  : {
                                      cursor: 'default',
                                      opacity: 0.5
                                    })}
                              >
                                {item.label}
                              </Center>
                            </MyTooltip>
                          );
                        })}
                        <Box ml={3} color={'MyGray.500'}>
                          / {t('Card')}
                        </Box>
                      </Flex>
                    </Box>
                  )}
                </Box>
              )}

              {/* cpu && memory */}
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label mr={'7px'}>{t('CPU')}</Label>
                <MySlider
                  markList={SliderList.cpu}
                  activeVal={getValues('cpu')}
                  setVal={(e) => {
                    setValue('cpu', SliderList.cpu[e].value);
                  }}
                  max={SliderList.cpu.length - 1}
                  min={0}
                  step={1}
                />
                <Box ml={5} transform={'translateY(10px)'} color={'grayModern.900'}>
                  (Core)
                </Box>
              </Flex>
              <Flex mb={8} pr={3} alignItems={'center'}>
                <Label mr={'7px'}>{t('Memory')}</Label>
                <MySlider
                  markList={SliderList.memory}
                  activeVal={getValues('memory')}
                  setVal={(e) => {
                    setValue('memory', SliderList.memory[e].value);
                  }}
                  max={SliderList.memory.length - 1}
                  min={0}
                  step={1}
                />
              </Flex>
            </Box>
          </Box>

          {/* network */}
          <Box id={'network'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'network'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
              {t('Network Configuration')}
            </Box>
            <Box px={'42px'} py={'24px'} userSelect={'none'}>
              {networks.map((network, i) => (
                <Flex
                  alignItems={'flex-start'}
                  key={network.id}
                  _notLast={{ pb: 6, borderBottom: theme.borders.base }}
                  _notFirst={{ pt: 6 }}
                >
                  <Box>
                    <Box mb={'10px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                      {t('Container Port')}
                    </Box>
                    <Input
                      h={'32px'}
                      type={'number'}
                      w={'110px'}
                      bg={'grayModern.50'}
                      {...register(`networks.${i}.port`, {
                        required:
                          t('app.The container exposed port cannot be empty') ||
                          'The container exposed port cannot be empty',
                        valueAsNumber: true,
                        min: {
                          value: 1,
                          message: t('app.The minimum exposed port is 1')
                        },
                        max: {
                          value: 65535,
                          message: t('app.The maximum number of exposed ports is 65535')
                        }
                      })}
                    />
                    {i === networks.length - 1 && (
                      <Box mt={3}>
                        <Button
                          w={'100px'}
                          variant={'outline'}
                          leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
                          onClick={() =>
                            appendNetworks({
                              networkName: '',
                              portName: nanoid(),
                              port: 80,
                              protocol: 'TCP',
                              appProtocol: 'HTTP',
                              openPublicDomain: false,
                              publicDomain: '',
                              customDomain: '',
                              domain: SEALOS_DOMAIN,
                              openNodePort: false,
                              nodePort: undefined
                            })
                          }
                        >
                          {t('Add Port')}
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <Box mx={7}>
                    <Box mb={'8px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                      {t('Open Public Access')}
                    </Box>
                    <Flex alignItems={'center'} h={'35px'}>
                      <Switch
                        className="driver-deploy-network-switch"
                        size={'lg'}
                        isChecked={!!network.openPublicDomain || !!network.openNodePort}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (APPLICATION_PROTOCOLS.includes(network.appProtocol)) {
                              updateNetworks(i, {
                                ...getValues('networks')[i],
                                networkName: network.networkName || `network-${nanoid()}`,
                                protocol: 'TCP',
                                appProtocol: network.appProtocol || 'HTTP',
                                openPublicDomain: true,
                                openNodePort: false,
                                publicDomain: network.publicDomain || nanoid(),
                                domain: network.domain || SEALOS_DOMAIN
                              });
                            } else {
                              updateNetworks(i, {
                                ...getValues('networks')[i],
                                networkName: network.networkName || `network-${nanoid()}`,
                                protocol: network.protocol,
                                appProtocol: 'HTTP',
                                openNodePort: true,
                                openPublicDomain: false,
                                customDomain: ''
                              });
                            }
                          } else {
                            updateNetworks(i, {
                              ...getValues('networks')[i],
                              openPublicDomain: false,
                              openNodePort: false
                            });
                          }
                        }}
                      ></Switch>
                    </Flex>
                  </Box>
                  {(network.openPublicDomain || network.openNodePort) && (
                    <>
                      <Box flex={'1 0 0'}>
                        <Box mb={'8px'} h={'20px'}></Box>
                        <Flex alignItems={'center'} h={'35px'}>
                          <MySelect
                            width={'120px'}
                            height={'32px'}
                            borderTopRightRadius={0}
                            borderBottomRightRadius={0}
                            value={
                              network.openPublicDomain
                                ? network.appProtocol
                                : network.openNodePort
                                ? network.protocol
                                : 'HTTP'
                            }
                            list={ProtocolList}
                            onchange={(val: any) => {
                              if (APPLICATION_PROTOCOLS.includes(val)) {
                                updateNetworks(i, {
                                  ...getValues('networks')[i],
                                  protocol: 'TCP',
                                  appProtocol: val,
                                  openNodePort: false,
                                  openPublicDomain: true,
                                  networkName: network.networkName || `network-${nanoid()}`,
                                  publicDomain: network.publicDomain || nanoid()
                                });
                              } else {
                                updateNetworks(i, {
                                  ...getValues('networks')[i],
                                  protocol: val,
                                  appProtocol: 'HTTP',
                                  openNodePort: true,
                                  openPublicDomain: false,
                                  customDomain: ''
                                });
                              }
                            }}
                          />
                          <Flex
                            maxW={'350px'}
                            flex={'1 0 0'}
                            alignItems={'center'}
                            h={'32px'}
                            bg={'grayModern.50'}
                            px={4}
                            border={theme.borders.base}
                            borderLeft={0}
                            borderTopRightRadius={'md'}
                            borderBottomRightRadius={'md'}
                          >
                            <Tooltip label={t('click_to_copy_tooltip')}>
                              <Box
                                flex={1}
                                userSelect={'all'}
                                className="textEllipsis"
                                onClick={() => {
                                  copyData(`${network.publicDomain}.${network.domain}`);
                                }}
                              >
                                {network.customDomain
                                  ? network.customDomain
                                  : network.openNodePort
                                  ? network?.nodePort
                                    ? `${network.protocol.toLowerCase()}.${network.domain}:${
                                        network.nodePort
                                      }`
                                    : `${network.protocol.toLowerCase()}.${network.domain}:${t(
                                        'pending_to_allocated'
                                      )}`
                                  : `${network.publicDomain}.${network.domain}`}
                              </Box>
                            </Tooltip>

                            {network.openPublicDomain && !network.openNodePort && (
                              <Box
                                fontSize={'11px'}
                                color={'brightBlue.600'}
                                cursor={'pointer'}
                                onClick={() =>
                                  setCustomAccessModalData({
                                    publicDomain: network.publicDomain,
                                    currentCustomDomain: network.customDomain,
                                    domain: network.domain
                                  })
                                }
                              >
                                {t('Custom Domain')}
                              </Box>
                            )}
                          </Flex>
                        </Flex>
                      </Box>
                    </>
                  )}
                  {networks.length > 1 && (
                    <Box ml={3}>
                      <Box mb={'8px'} h={'20px'}></Box>
                      <IconButton
                        height={'32px'}
                        width={'32px'}
                        aria-label={'button'}
                        variant={'outline'}
                        bg={'#FFF'}
                        _hover={{
                          color: 'red.600',
                          bg: 'rgba(17, 24, 36, 0.05)'
                        }}
                        icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                        onClick={() => removeNetworks(i)}
                      />
                    </Box>
                  )}
                </Flex>
              ))}
            </Box>
          </Box>
          {/* settings */}
          {already && (
            <Accordion
              pb={'100px'}
              id={'settings'}
              allowToggle
              index={isAdvancedOpen || navList[2].isSetting ? 0 : undefined}
            >
              <AccordionItem {...boxStyles}>
                <AccordionButton
                  {...headerStyles}
                  justifyContent={'space-between'}
                  _hover={{ bg: '' }}
                >
                  <Flex alignItems={'center'}>
                    <MyIcon name={'settings'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
                    <Box>{t('Advanced Configuration')}</Box>
                    <Center
                      bg={'grayModern.200'}
                      minW={'48px'}
                      px={'8px'}
                      height={'28px'}
                      ml={'14px'}
                      fontSize={'11px'}
                      borderRadius={'33px'}
                      color={'grayModern.700'}
                    >
                      {t('Option')}
                    </Center>
                  </Flex>
                  <AccordionIcon w={'20px'} h={'20px'} color={'#485264'} />
                </AccordionButton>

                <AccordionPanel px={'42px'} py={'24px'}>
                  <Flex mb={'16px'}>
                    <Label className={styles.formSecondTitle}>{t('Command')}</Label>
                    <Tip
                      icon={<InfoOutlineIcon />}
                      size="sm"
                      text={t('If no, the default command is used')}
                    />
                  </Flex>
                  {/* command && param */}
                  <FormControl mb={7}>
                    <Flex alignItems={'center'} className="driver-deploy-command">
                      <Label>{t('Run command')}</Label>
                      <Input
                        w={'350px'}
                        bg={getValues('runCMD') ? 'myWhite.500' : 'grayModern.100'}
                        placeholder={`${t('Such as')} /bin/bash -c`}
                        {...register('runCMD')}
                      />
                    </Flex>
                  </FormControl>
                  <FormControl>
                    <Flex alignItems={'center'}>
                      <Label>{t('Command parameters')}</Label>
                      <Input
                        w={'350px'}
                        bg={getValues('cmdParam') ? 'myWhite.500' : 'grayModern.100'}
                        placeholder={`${t('Such as')} sleep 10 && /entrypoint.sh db createdb`}
                        {...register('cmdParam')}
                      />
                    </Flex>
                  </FormControl>

                  <Divider my={'30px'} borderColor={'#EFF0F1'} />

                  {/* env */}
                  <Box w={'100%'} maxW={'600px'}>
                    <Flex alignItems={'center'}>
                      <Label className={styles.formSecondTitle}>{t('Environment Variables')}</Label>
                      <Button
                        w={'100%'}
                        height={'32px'}
                        variant={'outline'}
                        fontSize={'base'}
                        leftIcon={<MyIcon name="edit" width={'16px'} fill={'#485264'} />}
                        onClick={onOpenEditEnvs}
                      >
                        {t('Edit Environment Variables')}
                      </Button>
                    </Flex>
                    <Box pl={`${labelWidth}px`} mt={3}>
                      <table className={'table-cross'}>
                        <tbody>
                          {envs.map((env) => {
                            const valText = env.value
                              ? env.value
                              : env.valueFrom
                              ? 'value from | ***'
                              : '';
                            return (
                              <tr key={env.id}>
                                <th>{env.key}</th>
                                <th>
                                  <MyTooltip label={valText}>
                                    <Box
                                      className={styles.textEllipsis}
                                      style={{
                                        userSelect: 'auto'
                                      }}
                                    >
                                      {valText}
                                    </Box>
                                  </MyTooltip>
                                </th>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Box>
                  </Box>

                  <Divider my={'30px'} borderColor={'#EFF0F1'} />

                  <Box>
                    <Flex alignItems={'center'} maxW={'600px'}>
                      <Label className={styles.formSecondTitle}>{t('Configuration File')}</Label>
                      <Button
                        w={'100%'}
                        height={'32px'}
                        variant={'outline'}
                        onClick={() =>
                          setConfigEdit({ mountPath: '', value: '', key: '', volumeName: '' })
                        }
                        leftIcon={<MyIcon name="plus" w={'16px'} fill="#485264" />}
                      >
                        {t('form.add_configmap')}
                      </Button>
                    </Flex>
                    <Box mt={4} pl={`${labelWidth}px`}>
                      {configMaps.map((item, index) => (
                        <Flex key={item.id} _notLast={{ mb: 5 }} alignItems={'center'}>
                          <Flex
                            alignItems={'center'}
                            px={4}
                            py={1}
                            border={theme.borders.base}
                            flex={'0 0 320px'}
                            w={0}
                            borderRadius={'md'}
                            cursor={'pointer'}
                            onClick={() => setConfigEdit(item)}
                            bg={'grayModern.25'}
                          >
                            <MyIcon name={'configMap'} w={'20px'} />
                            <Box ml={4} flex={'1 0 0'} w={'0px'}>
                              <Box color={'myGray.900'} fontWeight={'bold'}>
                                {item.mountPath}
                              </Box>
                              <Box
                                className={styles.textEllipsis}
                                color={'grayModern.900'}
                                fontSize={'sm'}
                              >
                                {item.value}
                              </Box>
                            </Box>
                          </Flex>
                          <IconButton
                            height={'32px'}
                            width={'32px'}
                            variant={'outline'}
                            aria-label={'button'}
                            bg={'#FFF'}
                            ml={3}
                            _hover={{
                              color: 'red.600',
                              bg: 'rgba(17, 24, 36, 0.05)'
                            }}
                            icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                            onClick={() => removeConfigMaps(index)}
                          />
                        </Flex>
                      ))}
                    </Box>
                  </Box>

                  <Divider my={'30px'} borderColor={'#EFF0F1'} />

                  <Box className="driver-deploy-storage">
                    <Flex alignItems={'center'} mb={'10px'}>
                      <Label className={styles.formSecondTitle} m={0}>
                        {t('Local Storage')}
                      </Label>

                      <Button
                        w={'320px'}
                        height={'32px'}
                        variant={'outline'}
                        onClick={() => setStoreEdit({ name: '', path: '', value: 1 })}
                        leftIcon={<MyIcon name="plus" w={'16px'} fill="#485264" />}
                      >
                        {t('Add volume')}
                      </Button>
                      <Tip
                        ml={4}
                        icon={<InfoOutlineIcon />}
                        size="sm"
                        text={t('Data cannot be communicated between multiple instances')}
                      />
                    </Flex>
                    <Box mt={4} pl={`${labelWidth}px`}>
                      {storeList.map((item, index) => (
                        <Flex key={item.id} _notLast={{ mb: 5 }} alignItems={'center'}>
                          <Flex
                            alignItems={'center'}
                            px={4}
                            py={1}
                            border={theme.borders.base}
                            flex={'0 0 320px'}
                            w={0}
                            borderRadius={'md'}
                            cursor={'pointer'}
                            bg={'grayModern.25'}
                            onClick={() => setStoreEdit(item)}
                          >
                            <MyIcon name={'store'} w={'20px'} />
                            <Box ml={4} flex={'1 0 0'} w={'0px'}>
                              <Box color={'myGray.900'} fontWeight={'bold'}>
                                {item.path}
                              </Box>
                              <Box
                                className={styles.textEllipsis}
                                color={'grayModern.900'}
                                fontSize={'sm'}
                              >
                                {item.value} Gi
                              </Box>
                            </Box>
                          </Flex>
                          <IconButton
                            height={'32px'}
                            width={'32px'}
                            aria-label={'button'}
                            variant={'outline'}
                            bg={'#FFF'}
                            ml={3}
                            icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                            _hover={{
                              color: 'red.600',
                              bg: 'rgba(17, 24, 36, 0.05)'
                            }}
                            onClick={() => {
                              if (storeList.length === 1) {
                                toast({
                                  title: t('Store At Least One'),
                                  status: 'error'
                                });
                              } else {
                                removeStoreList(index);
                              }
                            }}
                          />
                        </Flex>
                      ))}
                      {persistentVolumes.map((item) => (
                        <Flex key={item.path} _notLast={{ mb: 5 }} alignItems={'center'}>
                          <Flex
                            alignItems={'center'}
                            px={4}
                            py={1}
                            border={theme.borders.base}
                            flex={'0 0 320px'}
                            w={0}
                            borderRadius={'md'}
                            cursor={'not-allowed'}
                            bg={'grayModern.25'}
                          >
                            <MyIcon name={'store'} w={'20px'} />
                            <Box ml={4} flex={'1 0 0'} w={'0px'}>
                              <Box color={'myGray.900'} fontWeight={'bold'}>
                                {item.path}
                              </Box>
                            </Box>
                            <Box fontSize={'12px'} color={'grayModern.600'}>
                              {t('shared')}
                            </Box>
                          </Flex>
                        </Flex>
                      ))}
                    </Box>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </Box>
      </Grid>
      {!!customAccessModalData && (
        <CustomAccessModal
          {...customAccessModalData}
          onClose={() => setCustomAccessModalData(undefined)}
          onSuccess={(e) => {
            const i = networks.findIndex(
              (item) => item.publicDomain === customAccessModalData.publicDomain
            );
            if (i === -1) return;
            updateNetworks(i, {
              ...networks[i],
              customDomain: e
            });
          }}
        />
      )}
      {isEditEnvs && (
        <EditEnvs defaultEnv={envs} onClose={onCloseEditEnvs} successCb={(e) => replaceEnvs(e)} />
      )}
      {configEdit && (
        <ConfigmapModal
          defaultValue={configEdit}
          listNames={configMaps
            .filter((item) => item.id !== configEdit.id)
            .map((item) => item.mountPath.toLocaleLowerCase())}
          successCb={(e) => {
            if (!e.id) {
              appendConfigMaps({
                ...e,
                key: mountPathToConfigMapKey(e.mountPath),
                volumeName: getValues('appName') + '-cm'
              });
            } else {
              setValue(
                'configMapList',
                configMaps.map((item) => {
                  return {
                    mountPath: item.id === e.id ? e.mountPath : item.mountPath,
                    value: item.id === e.id ? e.value : item.value,
                    key: item.id === e.id ? e.key : item.key,
                    volumeName: item.id === e.id ? e.volumeName : item.volumeName
                  };
                })
              );
            }
            setConfigEdit(undefined);
          }}
          closeCb={() => setConfigEdit(undefined)}
        />
      )}
      {storeEdit && (
        <StoreModal
          defaultValue={storeEdit}
          isEditStore={defaultStorePathList.includes(storeEdit.path)}
          listNames={storeList
            .filter((item) => item.id !== storeEdit.id)
            .map((item) => item.path.toLocaleLowerCase())}
          successCb={(e) => {
            if (!e.id) {
              appendStoreList(e);
            } else {
              setValue(
                'storeList',
                storeList.map((item) => ({
                  name: item.id === e.id ? e.name : item.name,
                  path: item.id === e.id ? e.path : item.path,
                  value: item.id === e.id ? e.value : item.value
                }))
              );
            }
            setStoreEdit(undefined);
          }}
          closeCb={() => setStoreEdit(undefined)}
        />
      )}
    </>
  );
};

export default Form;
