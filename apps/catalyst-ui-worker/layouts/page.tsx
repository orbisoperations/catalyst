"use client";
import { OrbisBadge, OrbisButton, TrashButton } from "@/components/elements";
import { DetailedView } from "@/components/layouts";
import { Flex } from "@chakra-ui/layout";

export default function Layouts() {
  return (
    <div id="detailedView">
      <DetailedView
        headerTitle={{
          text: "Data Channels",
          adjacent: <OrbisBadge>Click me</OrbisBadge>,
        }}
        showspinner={false}
        topbartitle="Data Channels"
        subtitle="Subtitle here"
        actions={
          <Flex gap={5} alignItems={"center"}>
            <OrbisButton>Save</OrbisButton>
            <OrbisButton variant={"ghost"}>Cancel</OrbisButton>
            <TrashButton />
          </Flex>
        }
      >
        Lorem ipsum, dolor sit amet consectetur adipisicing elit. Vero minima
        voluptate velit a, maxime blanditiis tempora mollitia deleniti ratione
        nemo quo ex assumenda incidunt quaerat cum dolor voluptates impedit
        dolorum alias asperiores officia voluptas aut nobis. Ea consequuntur
        quos sint rerum deleniti ullam obcaecati suscipit temporibus illo et
        necessitatibus, voluptates inventore enim aliquam. Deserunt adipisci
        neque deleniti natus iusto consectetur exercitationem esse, voluptates
        facilis culpa incidunt corrupti laboriosam ipsam nihil voluptatum
        quibusdam mollitia sed vero excepturi temporibus sapiente ratione
        officiis minima? Rerum, laboriosam! Non officiis quisquam minima
        obcaecati ipsam nesciunt odit magnam doloribus quam autem voluptatum
        praesentium harum dicta consequatur ducimus provident sequi suscipit
        velit magni voluptates mollitia, sapiente eos. Nesciunt perspiciatis
        earum nobis dicta fugit, odio quo. Aspernatur corporis cum deleniti
        maxime veniam dolor incidunt reiciendis hic mollitia consequuntur
        libero, atque eum doloribus dolores beatae amet consequatur perferendis
        dolorem praesentium cumque tempore ducimus! Beatae nihil voluptas neque
        quam? Laboriosam earum illo non quae deserunt eveniet assumenda quos
        numquam libero debitis atque repudiandae fugiat voluptates corrupti
        expedita harum facere ducimus aspernatur quam corporis explicabo,
        incidunt praesentium labore optio? Nisi, obcaecati asperiores!
        Necessitatibus dicta in maxime asperiores, ea voluptatem voluptate,
        facere totam voluptates, molestiae modi repudiandae aliquam. Amet
        eligendi doloremque vitae nisi nam assumenda ipsam, ab voluptates
        aliquam nostrum ducimus nemo. Libero culpa omnis accusamus cum beatae
        perferendis nesciunt quos asperiores corporis, commodi alias dolorum,
        quisquam ab aspernatur perspiciatis animi, vitae consectetur odio magnam
        deleniti! Dolorum neque eaque consectetur, tempore sapiente expedita
        quod rerum accusantium dolores corrupti numquam magni ad cupiditate
        ratione qui nam suscipit magnam ducimus non? Iusto eveniet recusandae
        esse cupiditate quas excepturi. Maxime itaque accusamus deleniti ipsa
        inventore odit beatae, dolor a. Inventore eum alias veritatis
        praesentium excepturi eaque nam cupiditate iusto asperiores iste quis,
        suscipit cumque? Ipsam, quae? Dolor ullam rerum adipisci asperiores
        dolorem iste fugit eos!
      </DetailedView>
    </div>
  );
}
