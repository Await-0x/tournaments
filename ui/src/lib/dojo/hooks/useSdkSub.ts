import { useEffect, useState } from "react";
import { BigNumberish } from "starknet";
import { SubscriptionQueryType, ParsedEntity } from "@dojoengine/sdk";
import { useDojo } from "@/context/dojo";
import { SchemaType } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";

export type TournamentSubQuery = SubscriptionQueryType<SchemaType>;

export type EntityResult = {
  entityId: BigNumberish;
} & Partial<SchemaType["tournament"]>;

export type UseSdkSubEntitiesResult = {
  entities: EntityResult[] | null;
  isSubscribed: boolean;
};

export type UseSdkSubEntitiesProps = {
  query: TournamentSubQuery;
  logging?: boolean;
  enabled?: boolean;
};

export const useSdkSubscribeEntities = ({
  query,
  enabled = true,
}: UseSdkSubEntitiesProps): UseSdkSubEntitiesResult => {
  const { sdk, nameSpace } = useDojo();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [entities, setEntities] = useState<EntityResult[] | null>(null);
  const state = useDojoStore.getState();

  useEffect(() => {
    let _unsubscribe: (() => void) | undefined;

    const _subscribe = async () => {
      const subscription = await sdk.subscribeEntityQuery({
        query,
        callback: (response) => {
          if (response.error) {
            console.error(
              "useSdkSubscribeEntities() error:",
              response.error.message
            );
          } else if (
            response.data &&
            (response.data[0] as Partial<ParsedEntity<SchemaType>>).entityId !==
              "0x0"
          ) {
            console.log(
              "useSdkSubscribeEntities() response.data:",
              response.data
            );
            response.data.forEach((entity) => {
              state.updateEntity(entity as Partial<ParsedEntity<SchemaType>>);
            });
            setEntities(
              response.data.map(
                (e: any) =>
                  ({
                    entityId: e.entityId,
                    ...e.models[nameSpace],
                  } as EntityResult)
              )
            );
          }
        },
      });
      setIsSubscribed(true);
      _unsubscribe = () => subscription.cancel();
    };

    // mount
    setIsSubscribed(false);
    if (enabled) {
      _subscribe();
    } else {
      setEntities(null);
    }

    // umnount
    return () => {
      setIsSubscribed(false);
      _unsubscribe?.();
      _unsubscribe = undefined;
    };
  }, [sdk, query, enabled]);

  return {
    entities,
    isSubscribed,
  };
};
